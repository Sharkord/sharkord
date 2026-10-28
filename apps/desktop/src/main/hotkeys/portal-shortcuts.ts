import type { TDesktopHotkeyPhase } from '@sharkord/shared';
import { Message, sessionBus, Variant, type MessageBus } from 'dbus-next';
import { APP_ID } from '../../shared/constants';
import { i18n } from '../i18n';

// wayland lets no app see the keys of another, global shortcuts only come through the xdg
// GlobalShortcuts portal. electron's globalShortcut is not used for it, for two reasons:
//
// 1. after a restart the shortcuts stopped working. since plasma 6.7.4 kde only arms
//    shortcuts bound in the current session, and chromium skips BindShortcuts when the
//    desktop already lists every shortcut. chromium fixed it in 158, which first ships in
//    electron 46, so this reason goes away once electron is upgraded past it.
//    kde change: https://invent.kde.org/plasma/xdg-desktop-portal-kde/-/commit/0d743a716918a745e69845687e548990907e79ba
//    kde bug: https://bugs.kde.org/show_bug.cgi?id=523063
//    chromium fix: https://chromium-review.googlesource.com/c/chromium/src/+/8527334
//    chromium bug: https://issues.chromium.org/issues/404298968
//
// 2. push to talk needs the key release. chromium only listens to the portal's Activated
//    signal, never Deactivated, and electron's globalShortcut callback only fires on press.
//    nothing upstream changes this, so this module stays for it.
//    https://www.electronjs.org/docs/latest/api/global-shortcut

type TPortalShortcutHandlers = {
  onShortcut: (accelerator: string, phase: TDesktopHotkeyPhase) => void;
  onBound: (inactive: string[]) => void;
};

type TBoundShortcut = [string, Record<string, Variant>];

type TPortalResponse = {
  code: number;
  results: Record<string, Variant>;
};

const PORTAL_NAME = 'org.freedesktop.portal.Desktop';
const PORTAL_PATH = '/org/freedesktop/portal/desktop';
const SHORTCUTS_INTERFACE = 'org.freedesktop.portal.GlobalShortcuts';
const REQUEST_INTERFACE = 'org.freedesktop.portal.Request';
const SESSION_INTERFACE = 'org.freedesktop.portal.Session';
const REGISTRY_INTERFACE = 'org.freedesktop.host.portal.Registry';
const RESPONSE_SUCCESS = 0;

const MODIFIERS: Record<string, string> = {
  Control: 'CTRL',
  Alt: 'ALT',
  Shift: 'SHIFT',
  Super: 'LOGO'
};

// electron's key names to the xkb keysym names of portal triggers
const KEYSYMS: Record<string, string> = {
  Space: 'space',
  Tab: 'Tab',
  Enter: 'Return',
  Backspace: 'BackSpace',
  Delete: 'Delete',
  Insert: 'Insert',
  Home: 'Home',
  End: 'End',
  PageUp: 'Page_Up',
  PageDown: 'Page_Down',
  Esc: 'Escape',
  Up: 'Up',
  Down: 'Down',
  Left: 'Left',
  Right: 'Right',
  '-': 'minus',
  '=': 'equal',
  '[': 'bracketleft',
  ']': 'bracketright',
  '\\': 'backslash',
  ';': 'semicolon',
  "'": 'apostrophe',
  ',': 'comma',
  '.': 'period',
  '/': 'slash',
  '`': 'grave',
  Capslock: 'Caps_Lock',
  Numlock: 'Num_Lock',
  Scrolllock: 'Scroll_Lock',
  PrintScreen: 'Print',
  numadd: 'KP_Add',
  numsub: 'KP_Subtract',
  nummult: 'KP_Multiply',
  numdiv: 'KP_Divide',
  numdec: 'KP_Decimal',
  MediaPlayPause: 'XF86AudioPlay',
  MediaStop: 'XF86AudioStop',
  MediaNextTrack: 'XF86AudioNext',
  MediaPreviousTrack: 'XF86AudioPrev',
  VolumeUp: 'XF86AudioRaiseVolume',
  VolumeDown: 'XF86AudioLowerVolume',
  VolumeMute: 'XF86AudioMute'
};

const NUMPAD_DIGIT_REGEX = /^num([0-9])$/;
const PLAIN_KEY_REGEX = /^([A-Z0-9]|F[0-9]{1,2})$/;

const toKeysym = (key: string) => {
  const named = KEYSYMS[key];

  if (named) {
    return named;
  }

  const numpadDigit = key.match(NUMPAD_DIGIT_REGEX);

  if (numpadDigit) {
    return `KP_${numpadDigit[1]}`;
  }

  if (!PLAIN_KEY_REGEX.test(key)) {
    return undefined;
  }

  // letters are lowercase keysyms, function keys keep their name
  return key.length === 1 ? key.toLowerCase() : key;
};

// only a suggestion the user confirms in the desktop's dialog, a key without a name gets none
const toPortalTrigger = (accelerator: string) => {
  const parts = accelerator.split('+');
  const key = parts.pop();
  const keysym = key ? toKeysym(key) : undefined;
  const modifiers = parts.map((part) => MODIFIERS[part]);

  if (!keysym || modifiers.some((modifier) => modifier === undefined)) {
    return undefined;
  }

  return [...modifiers, keysym].join('+');
};

// a declined shortcut is still stored, only without a key, so the desktop does not ask again
const getInactive = (accelerators: string[], shortcuts: TBoundShortcut[]) => {
  const active = new Set<string>();

  for (const [id, properties] of shortcuts) {
    const trigger = properties.trigger_description;

    if (trigger && trigger.value) {
      active.add(id);
    }
  }

  return accelerators.filter((accelerator) => !active.has(accelerator));
};

const isPortalShortcutsPlatform = () =>
  process.platform === 'linux' && process.env.XDG_SESSION_TYPE === 'wayland';

const pendingRequests = new Map<string, (response: TPortalResponse) => void>();

let bus: MessageBus | null = null;
let handlers: TPortalShortcutHandlers = {
  onShortcut: () => {},
  onBound: () => {}
};
let sessionHandle: string | null = null;
let wanted: string[] = [];
let boundKey = '';
let lastInactive: string[] = [];
let isApplying = false;
let nextToken = 0;

const createToken = () => {
  nextToken += 1;

  return `sharkord_${nextToken}`;
};

const getBus = () => {
  if (!bus) {
    throw new Error('the session bus is not connected');
  }

  return bus;
};

const call = (
  member: string,
  signature: string,
  body: unknown[],
  {
    path = PORTAL_PATH,
    iface = SHORTCUTS_INTERFACE,
    destination = PORTAL_NAME
  } = {}
) => {
  const connection = getBus();

  return connection.call(
    new Message({
      destination,
      path,
      interface: iface,
      member,
      signature,
      body
    })
  );
};

// portal methods answer later with a Response signal on a request object. its path is known
// from the connection name and the token, so the answer is waited for before the call is made
const request = async (
  member: string,
  signature: string,
  createBody: (options: Record<string, Variant>) => unknown[]
) => {
  const connection = getBus();
  const token = createToken();
  const { name } = connection as MessageBus & { name: string };
  // the unique name ':1.42' becomes '1_42' in request paths
  const uniqueName = name.slice(1);
  const sender = uniqueName.replaceAll('.', '_');
  const requestPath = `${PORTAL_PATH}/request/${sender}/${token}`;

  const response = new Promise<TPortalResponse>((resolve) => {
    pendingRequests.set(requestPath, resolve);
  });

  try {
    await call(
      member,
      signature,
      createBody({ handle_token: new Variant('s', token) })
    );
  } catch (error) {
    pendingRequests.delete(requestPath);

    throw error;
  }

  return response;
};

const handleMessage = (message: Message) => {
  if (
    message.interface === REQUEST_INTERFACE &&
    message.member === 'Response'
  ) {
    const resolve = pendingRequests.get(message.path);

    if (resolve) {
      const [code, results] = message.body as [number, Record<string, Variant>];

      pendingRequests.delete(message.path);
      resolve({ code, results });
    }

    return;
  }

  if (message.interface !== SHORTCUTS_INTERFACE) {
    return;
  }

  const [handle] = message.body as [string];

  if (handle !== sessionHandle) {
    return;
  }

  // the user changed the keys in the system settings, a bind in progress reports its own result
  if (message.member === 'ShortcutsChanged') {
    const [, shortcuts] = message.body as [string, TBoundShortcut[]];

    if (!isApplying) {
      lastInactive = getInactive(wanted, shortcuts);
      handlers.onBound(lastInactive);
    }

    return;
  }

  const [, shortcutId] = message.body as [string, string];

  if (message.member === 'Activated') {
    handlers.onShortcut(shortcutId, 'down');
  } else if (message.member === 'Deactivated') {
    handlers.onShortcut(shortcutId, 'up');
  }
};

const connect = async () => {
  bus = sessionBus();

  bus.on('message', handleMessage);
  bus.on('error', (error) => {
    console.error('portal shortcuts: session bus error', error);
  });

  const busOptions = {
    path: '/org/freedesktop/DBus',
    iface: 'org.freedesktop.DBus',
    destination: 'org.freedesktop.DBus'
  };

  await call(
    'AddMatch',
    's',
    [`type='signal',interface='${REQUEST_INTERFACE}',member='Response'`],
    busOptions
  );

  await call(
    'AddMatch',
    's',
    [`type='signal',interface='${SHORTCUTS_INTERFACE}'`],
    busOptions
  );

  // a host app names itself before any portal call, newer portals refuse shortcuts without
  // an app id. older ones have no registry and take the id from the systemd scope instead
  try {
    await call('Register', 'sa{sv}', [APP_ID, {}], {
      iface: REGISTRY_INTERFACE
    });
  } catch (error) {
    console.warn('portal shortcuts: could not register the app id', error);
  }
};

const closeSession = async () => {
  if (!sessionHandle) {
    return;
  }

  const handle = sessionHandle;

  sessionHandle = null;

  try {
    await call('Close', '', [], { path: handle, iface: SESSION_INTERFACE });
  } catch (error) {
    console.warn('portal shortcuts: could not close the session', error);
  }
};

// a fresh session for every change, as chromium does, gnome refuses a second bind in one.
// binding again in every session is what arms remembered shortcuts, the desktop only asks
// the user about the ones it has not seen before
const bind = async (accelerators: string[]): Promise<string[]> => {
  await closeSession();

  if (accelerators.length === 0) {
    return [];
  }

  if (!bus) {
    await connect();
  }

  const created = await request('CreateSession', 'a{sv}', (options) => [
    { ...options, session_handle_token: new Variant('s', createToken()) }
  ]);

  const handle = created.results.session_handle;

  if (created.code !== RESPONSE_SUCCESS || !handle) {
    throw new Error(`CreateSession failed (response ${created.code})`);
  }

  sessionHandle = String(handle.value);

  const shortcuts = accelerators.map((accelerator) => {
    const trigger = toPortalTrigger(accelerator);

    const properties: Record<string, Variant> = {
      description: new Variant(
        's',
        i18n.t('hotkeyDescription', { shortcut: accelerator })
      )
    };

    if (trigger) {
      properties.preferred_trigger = new Variant('s', trigger);
    }

    return [accelerator, properties];
  });

  const bound = await request(
    'BindShortcuts',
    'oa(sa{sv})sa{sv}',
    (options) => [sessionHandle, shortcuts, '', options]
  );

  // declining the dialog cancels the whole request when none of them were known before
  if (bound.code !== RESPONSE_SUCCESS) {
    return accelerators;
  }

  const boundShortcuts = bound.results.shortcuts;

  return getInactive(
    accelerators,
    (boundShortcuts ? boundShortcuts.value : []) as TBoundShortcut[]
  );
};

// one bind at a time: a desktop dialog can stay open for long, changes made meanwhile are
// applied once it is answered
const apply = async () => {
  if (isApplying) {
    return;
  }

  isApplying = true;

  while (wanted.join('\n') !== boundKey) {
    const target = wanted;
    let inactive = target;

    boundKey = target.join('\n');

    try {
      inactive = await bind(target);
    } catch (error) {
      console.error('portal shortcuts: could not bind', error);
    }

    // a result for shortcuts that changed meanwhile is left to the bind that follows
    if (wanted === target) {
      lastInactive = inactive;
      handlers.onBound(inactive);
    }
  }

  isApplying = false;
};

const setPortalShortcuts = (
  accelerators: string[],
  nextHandlers: TPortalShortcutHandlers
) => {
  const sorted = [...accelerators].sort();

  handlers = nextHandlers;

  // the same shortcuts again keep the array, so a bind in progress still reports its result
  if (sorted.join('\n') !== wanted.join('\n')) {
    wanted = sorted;
  } else if (!isApplying && sorted.join('\n') === boundKey) {
    // nothing to bind, the server now holding the keys still learns which are inactive
    handlers.onBound(lastInactive);
  }

  // never rejects, every bind failure is caught and logged inside
  apply();
};

export { isPortalShortcutsPlatform, setPortalShortcuts, toPortalTrigger };
