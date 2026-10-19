import { describe, expect, test } from 'bun:test';
import { comboToAccelerator } from '../combo-to-accelerator';

describe('combo to accelerator', () => {
  test('converts letters, digits and function keys', () => {
    expect(comboToAccelerator('KeyM')).toBe('M');
    expect(comboToAccelerator('Digit5')).toBe('5');
    expect(comboToAccelerator('F5')).toBe('F5');
    expect(comboToAccelerator('F24')).toBe('F24');
  });

  test('keeps the modifiers in the order they were recorded', () => {
    expect(comboToAccelerator('ctrl+alt+shift+KeyM')).toBe(
      'Control+Alt+Shift+M'
    );
    expect(comboToAccelerator('meta+F5')).toBe('Super+F5');
  });

  test('names the keys electron spells differently', () => {
    expect(comboToAccelerator('ctrl+ArrowUp')).toBe('Control+Up');
    expect(comboToAccelerator('Escape')).toBe('Esc');
    expect(comboToAccelerator('Numpad7')).toBe('num7');
    expect(comboToAccelerator('NumpadAdd')).toBe('numadd');
    expect(comboToAccelerator('shift+Backquote')).toBe('Shift+`');
    expect(comboToAccelerator('MediaTrackNext')).toBe('MediaNextTrack');
    expect(comboToAccelerator('AudioVolumeMute')).toBe('VolumeMute');
  });

  test('refuses keys electron has no name for', () => {
    expect(comboToAccelerator('IntlBackslash')).toBeUndefined();
    expect(comboToAccelerator('F25')).toBeUndefined();
    expect(comboToAccelerator('ctrl+Mouse4')).toBeUndefined();
  });

  test('refuses unknown modifiers and empty combos', () => {
    expect(comboToAccelerator('hyper+KeyM')).toBeUndefined();
    expect(comboToAccelerator('')).toBeUndefined();
    expect(comboToAccelerator('ctrl+')).toBeUndefined();
  });
});
