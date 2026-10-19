const MODIFIERS: Record<string, string> = {
  ctrl: 'Control',
  alt: 'Alt',
  shift: 'Shift',
  meta: 'Super'
};

// physical key codes, as the key picker records them, to electron's key names
const NAMED_KEYS: Record<string, string> = {
  Space: 'Space',
  Tab: 'Tab',
  Enter: 'Enter',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Insert: 'Insert',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  Escape: 'Esc',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backquote: '`',
  CapsLock: 'Capslock',
  NumLock: 'Numlock',
  ScrollLock: 'Scrolllock',
  PrintScreen: 'PrintScreen',
  NumpadAdd: 'numadd',
  NumpadSubtract: 'numsub',
  NumpadMultiply: 'nummult',
  NumpadDivide: 'numdiv',
  NumpadDecimal: 'numdec',
  MediaPlayPause: 'MediaPlayPause',
  MediaStop: 'MediaStop',
  MediaTrackNext: 'MediaNextTrack',
  MediaTrackPrevious: 'MediaPreviousTrack',
  AudioVolumeUp: 'VolumeUp',
  AudioVolumeDown: 'VolumeDown',
  AudioVolumeMute: 'VolumeMute'
};

const PATTERN_KEYS: [RegExp, (match: RegExpMatchArray) => string][] = [
  [/^Key([A-Z])$/, ([, letter]) => letter!],
  [/^Digit([0-9])$/, ([, digit]) => digit!],
  [/^Numpad([0-9])$/, ([, digit]) => `num${digit}`],
  [/^(F(?:[1-9]|1[0-9]|2[0-4]))$/, ([, key]) => key!]
];

const keyToAccelerator = (code: string) => {
  const named = NAMED_KEYS[code];

  if (named) {
    return named;
  }

  for (const [pattern, toKey] of PATTERN_KEYS) {
    const match = code.match(pattern);

    if (match) {
      return toKey(match);
    }
  }

  return undefined;
};

const comboToAccelerator = (combo: string) => {
  const parts = combo.split('+');
  const code = parts.pop();

  if (!code) {
    return undefined;
  }

  const modifiers = parts.map((part) => MODIFIERS[part]);

  if (modifiers.some((modifier) => modifier === undefined)) {
    return undefined;
  }

  const key = keyToAccelerator(code);

  if (!key) {
    return undefined;
  }

  return [...modifiers, key].join('+');
};

export { comboToAccelerator };
