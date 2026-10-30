import { describe, expect, test } from 'bun:test';
import { comboToAccelerator } from '../combo-to-accelerator';

const UNSUPPORTED = { error: 'unsupported' } as const;
const NEEDS_MODIFIER = { error: 'needs-modifier' } as const;

describe('combo to accelerator', () => {
  test('converts letters, digits and function keys', () => {
    expect(comboToAccelerator('ctrl+KeyM')).toEqual({
      accelerator: 'Control+M'
    });
    expect(comboToAccelerator('alt+Digit5')).toEqual({
      accelerator: 'Alt+5'
    });
    expect(comboToAccelerator('F5')).toEqual({ accelerator: 'F5' });
    expect(comboToAccelerator('F24')).toEqual({ accelerator: 'F24' });
  });

  test('keeps the modifiers in the order they were recorded', () => {
    expect(comboToAccelerator('ctrl+alt+shift+KeyM')).toEqual({
      accelerator: 'Control+Alt+Shift+M'
    });
    expect(comboToAccelerator('meta+F5')).toEqual({
      accelerator: 'Super+F5'
    });
  });

  test('names the keys electron spells differently', () => {
    expect(comboToAccelerator('ctrl+ArrowUp')).toEqual({
      accelerator: 'Control+Up'
    });
    expect(comboToAccelerator('ctrl+Escape')).toEqual({
      accelerator: 'Control+Esc'
    });
    expect(comboToAccelerator('alt+Numpad7')).toEqual({
      accelerator: 'Alt+num7'
    });
    expect(comboToAccelerator('ctrl+NumpadAdd')).toEqual({
      accelerator: 'Control+numadd'
    });
    expect(comboToAccelerator('ctrl+shift+Backquote')).toEqual({
      accelerator: 'Control+Shift+`'
    });
    expect(comboToAccelerator('MediaTrackNext')).toEqual({
      accelerator: 'MediaNextTrack'
    });
    expect(comboToAccelerator('AudioVolumeMute')).toEqual({
      accelerator: 'VolumeMute'
    });
  });

  test('accepts keys that type nothing without a modifier', () => {
    expect(comboToAccelerator('F13')).toEqual({ accelerator: 'F13' });
    expect(comboToAccelerator('MediaPlayPause')).toEqual({
      accelerator: 'MediaPlayPause'
    });
    expect(comboToAccelerator('ScrollLock')).toEqual({
      accelerator: 'Scrolllock'
    });
  });

  test('refuses keys that type text unless ctrl, alt or super is held', () => {
    expect(comboToAccelerator('KeyM')).toEqual(NEEDS_MODIFIER);
    expect(comboToAccelerator('Digit5')).toEqual(NEEDS_MODIFIER);
    expect(comboToAccelerator('Space')).toEqual(NEEDS_MODIFIER);
    expect(comboToAccelerator('Escape')).toEqual(NEEDS_MODIFIER);
    expect(comboToAccelerator('Numpad7')).toEqual(NEEDS_MODIFIER);
    expect(comboToAccelerator('shift+KeyM')).toEqual(NEEDS_MODIFIER);
    expect(comboToAccelerator('shift+Backquote')).toEqual(NEEDS_MODIFIER);
  });

  test('refuses keys electron has no name for', () => {
    expect(comboToAccelerator('ctrl+IntlBackslash')).toEqual(UNSUPPORTED);
    expect(comboToAccelerator('F25')).toEqual(UNSUPPORTED);
    expect(comboToAccelerator('ctrl+Mouse4')).toEqual(UNSUPPORTED);
  });

  test('refuses unknown modifiers and empty combos', () => {
    expect(comboToAccelerator('hyper+KeyM')).toEqual(UNSUPPORTED);
    expect(comboToAccelerator('')).toEqual(UNSUPPORTED);
    expect(comboToAccelerator('ctrl+')).toEqual(UNSUPPORTED);
  });
});
