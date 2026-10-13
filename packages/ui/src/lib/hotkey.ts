type TModifierState = Pick<
  KeyboardEvent,
  'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'
>;

const MODIFIER_CODES = new Set([
  'ControlLeft',
  'ControlRight',
  'ShiftLeft',
  'ShiftRight',
  'AltLeft',
  'AltRight',
  'AltGraph',
  'MetaLeft',
  'MetaRight'
]);

const MODIFIER_LABELS: Record<string, string> = {
  ctrl: 'Ctrl',
  alt: 'Alt',
  shift: 'Shift',
  meta: 'Meta'
};

// combos a page cannot take from the browser (tabs and windows) or that belong
// to the OS. meta is the Windows or Super key, which desktops use for their own
const RESERVED_COMBOS = new Set([
  'ctrl+KeyW',
  'ctrl+KeyT',
  'ctrl+KeyN',
  'ctrl+KeyQ',
  'ctrl+shift+KeyW',
  'ctrl+shift+KeyT',
  'ctrl+shift+KeyN',
  'ctrl+Tab',
  'ctrl+shift+Tab',
  'ctrl+PageUp',
  'ctrl+PageDown',
  'ctrl+F4',
  'alt+F4',
  'alt+Tab',
  'alt+Escape',
  'ctrl+Escape',
  'ctrl+alt+Delete'
]);

const withModifiers = (modifiers: TModifierState, key: string) => {
  const parts: string[] = [];

  if (modifiers.ctrlKey) parts.push('ctrl');
  if (modifiers.altKey) parts.push('alt');
  if (modifiers.shiftKey) parts.push('shift');
  if (modifiers.metaKey) parts.push('meta');

  return [...parts, key].join('+');
};

// uses the code, not the key, so a bind survives a layout change and the
// bridge only needs one table from code to native keycode
const comboFromKeyboardEvent = (event: KeyboardEvent) => {
  if (!event.code || MODIFIER_CODES.has(event.code)) {
    return undefined;
  }

  return withModifiers(event, event.code);
};

const isReservedCombo = (combo: string) => {
  const keys = combo.split('+');

  return RESERVED_COMBOS.has(combo) || keys.includes('meta');
};

const formatKey = (key: string) => {
  const modifier = MODIFIER_LABELS[key];

  if (modifier) {
    return modifier;
  }

  if (key.startsWith('Key')) {
    return key.slice('Key'.length);
  }

  if (key.startsWith('Digit')) {
    return key.slice('Digit'.length);
  }

  return key;
};

const formatCombo = (combo: string) => {
  const keys = combo.split('+');
  const labels = keys.map(formatKey);

  return labels.join(' + ');
};

export { comboFromKeyboardEvent, formatCombo, isReservedCombo };
