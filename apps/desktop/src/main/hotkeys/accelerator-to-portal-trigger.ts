// electron accelerators to the xdg shortcut format of portal triggers, CTRL+SHIFT+m
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

export { toPortalTrigger };
