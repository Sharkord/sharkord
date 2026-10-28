import type {
  TDesktopHotkeyBinding,
  TDesktopHotkeyCapabilities,
  TDesktopHotkeyError,
  TDesktopHotkeyPhase
} from '@sharkord/shared';
import { globalShortcut } from 'electron';
import { comboToAccelerator } from './combo-to-accelerator';
import {
  isPortalShortcutsPlatform,
  setPortalShortcuts
} from './portal-shortcuts';

type TOnHotkey = (actionId: string, phase: TDesktopHotkeyPhase) => void;

type TOnHotkeyErrors = (errors: TDesktopHotkeyError[]) => void;

type TServerHotkeys = {
  bindings: (TDesktopHotkeyBinding & { accelerator: string | undefined })[];
  onHotkey: TOnHotkey;
  onErrors: TOnHotkeyErrors;
};

const usesPortal = isPortalShortcutsPlatform();

const servers = new Map<string, TServerHotkeys>();
const registered = new Set<string>();

// only one server holds its keys, the others leave them free for other apps
let activeServerId: string | null = null;

const press = (accelerator: string, phase: TDesktopHotkeyPhase) => {
  const active = activeServerId ? servers.get(activeServerId) : undefined;

  if (!active) {
    return;
  }

  for (const binding of active.bindings) {
    if (binding.accelerator === accelerator) {
      active.onHotkey(binding.actionId, phase);
    }
  }
};

const reportInactive = (inactive: string[]) => {
  const active = activeServerId ? servers.get(activeServerId) : undefined;

  if (!active) {
    return;
  }

  const inactiveBindings = active.bindings.filter(
    ({ accelerator }) => accelerator && inactive.includes(accelerator)
  );
  const errors = inactiveBindings.map(
    ({ actionId }): TDesktopHotkeyError => ({ actionId, reason: 'declined' })
  );

  active.onErrors(errors);
};

const sync = () => {
  const wanted = new Set<string>();
  const active = activeServerId ? servers.get(activeServerId) : undefined;

  for (const { accelerator } of active ? active.bindings : []) {
    if (accelerator) {
      wanted.add(accelerator);
    }
  }

  if (usesPortal) {
    setPortalShortcuts([...wanted], {
      onShortcut: press,
      onBound: reportInactive
    });

    return;
  }

  for (const accelerator of registered) {
    if (!wanted.has(accelerator)) {
      globalShortcut.unregister(accelerator);
      registered.delete(accelerator);
    }
  }

  for (const accelerator of wanted) {
    if (registered.has(accelerator)) {
      continue;
    }

    try {
      // electron reports presses only, never the release
      if (
        globalShortcut.register(accelerator, () => press(accelerator, 'down'))
      ) {
        registered.add(accelerator);
      }
    } catch (error) {
      console.error('failed to register a hotkey', accelerator, error);
    }
  }
};

const setServerHotkeys = (
  serverId: string,
  bindings: TDesktopHotkeyBinding[],
  onHotkey: TOnHotkey,
  onErrors: TOnHotkeyErrors
): TDesktopHotkeyError[] => {
  const errors: TDesktopHotkeyError[] = [];
  const withAccelerators = bindings.map((binding) => {
    const result = comboToAccelerator(binding.combo);

    if ('error' in result) {
      errors.push({ actionId: binding.actionId, reason: result.error });

      return { ...binding, accelerator: undefined };
    }

    return { ...binding, accelerator: result.accelerator };
  });

  servers.set(serverId, { bindings: withAccelerators, onHotkey, onErrors });
  sync();

  for (const { actionId, accelerator } of withAccelerators) {
    // a server in the background holds no keys, so nothing can be taken from it yet. the
    // portal settles conflicts in the desktop's own dialog
    if (
      !usesPortal &&
      accelerator &&
      serverId === activeServerId &&
      !registered.has(accelerator)
    ) {
      errors.push({ actionId, reason: 'taken' });
    }
  }

  return errors;
};

const clearServerHotkeys = (serverId: string) => {
  if (!servers.delete(serverId)) {
    return;
  }

  sync();
};

const setActiveHotkeyServer = (serverId: string | null) => {
  if (serverId === activeServerId) {
    return;
  }

  activeServerId = serverId;

  sync();
};

const getHotkeyCapabilities = (): TDesktopHotkeyCapabilities => ({
  keyUp: usesPortal,
  systemManaged: usesPortal
});

export {
  clearServerHotkeys,
  getHotkeyCapabilities,
  setActiveHotkeyServer,
  setServerHotkeys
};
