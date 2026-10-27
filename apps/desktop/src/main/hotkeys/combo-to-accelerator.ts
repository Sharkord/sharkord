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

// keys that type nothing, so holding one system wide takes no text from other apps
const STANDALONE_KEY_REGEX =
  /^(F(?:[1-9]|1[0-9]|2[0-4])|Media.+|Audio.+|PrintScreen|ScrollLock)$/;

// shift alone still types, only these keep a combo out of what other apps receive as text
const TEXT_SAFE_MODIFIERS = new Set(['ctrl', 'alt', 'meta']);

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

type TComboResult =
  | { accelerator: string }
  | { error: 'unsupported' | 'needs-modifier' };

const comboToAccelerator = (combo: string): TComboResult => {
  const parts = combo.split('+');
  const code = parts.pop();

  if (!code) {
    return { error: 'unsupported' };
  }

  const modifiers = parts.map((part) => MODIFIERS[part]);

  if (modifiers.some((modifier) => modifier === undefined)) {
    return { error: 'unsupported' };
  }

  const key = keyToAccelerator(code);

  if (!key) {
    return { error: 'unsupported' };
  }

  const isStandalone = STANDALONE_KEY_REGEX.test(code);
  const hasTextSafeModifier = parts.some((part) =>
    TEXT_SAFE_MODIFIERS.has(part)
  );

  if (!isStandalone && !hasTextSafeModifier) {
    return { error: 'needs-modifier' };
  }

  return { accelerator: [...modifiers, key].join('+') };
};

export { comboToAccelerator };
export type { TComboResult };
