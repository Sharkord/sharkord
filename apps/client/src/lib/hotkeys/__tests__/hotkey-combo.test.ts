import {
  comboFromKeyboardEvent,
  formatCombo,
  isReservedCombo
} from '@sharkord/ui/src/lib/hotkey';
import { describe, expect, it } from 'bun:test';

const NO_MODIFIERS = {
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false
};

const keyboard = (code: string, modifiers: Partial<typeof NO_MODIFIERS> = {}) =>
  ({ code, ...NO_MODIFIERS, ...modifiers }) as KeyboardEvent;

describe('combo', () => {
  it('builds keyboard combos from the physical key with ordered modifiers', () => {
    expect(comboFromKeyboardEvent(keyboard('KeyM'))).toBe('KeyM');
    expect(
      comboFromKeyboardEvent(
        keyboard('KeyM', { shiftKey: true, ctrlKey: true, altKey: true })
      )
    ).toBe('ctrl+alt+shift+KeyM');
  });

  it('ignores modifier only presses and keys without a code', () => {
    expect(comboFromKeyboardEvent(keyboard('ShiftLeft'))).toBeUndefined();
    expect(comboFromKeyboardEvent(keyboard('MetaRight'))).toBeUndefined();
    expect(comboFromKeyboardEvent(keyboard(''))).toBeUndefined();
  });

  it('formats combos for display', () => {
    expect(formatCombo('ctrl+shift+KeyM')).toBe('Ctrl + Shift + M');
    expect(formatCombo('alt+Digit5')).toBe('Alt + 5');
    expect(formatCombo('meta+F5')).toBe('Meta + F5');
  });

  it('flags combos the browser or the OS keep for themselves', () => {
    expect(isReservedCombo('ctrl+KeyW')).toBe(true);
    expect(isReservedCombo('alt+F4')).toBe(true);
    expect(isReservedCombo('meta+KeyD')).toBe(true);
    expect(isReservedCombo('ctrl+shift+meta+KeyA')).toBe(true);
    expect(isReservedCombo('ctrl+alt+KeyM')).toBe(false);
    expect(isReservedCombo('F9')).toBe(false);
  });
});
