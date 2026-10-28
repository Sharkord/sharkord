import { describe, expect, test } from 'bun:test';
import { toPortalTrigger } from '../portal-shortcuts';

describe('portal trigger', () => {
  test('names modifiers the way the portal does and lowercases letters', () => {
    expect(toPortalTrigger('Control+L')).toBe('CTRL+l');
    expect(toPortalTrigger('Control+Alt+Shift+M')).toBe('CTRL+ALT+SHIFT+m');
    expect(toPortalTrigger('Super+5')).toBe('LOGO+5');
  });

  test('keeps function keys and maps named keys to their keysyms', () => {
    expect(toPortalTrigger('F13')).toBe('F13');
    expect(toPortalTrigger('Control+Esc')).toBe('CTRL+Escape');
    expect(toPortalTrigger('Alt+PageUp')).toBe('ALT+Page_Up');
    expect(toPortalTrigger('Control+`')).toBe('CTRL+grave');
    expect(toPortalTrigger('Alt+num7')).toBe('ALT+KP_7');
    expect(toPortalTrigger('Control+numadd')).toBe('CTRL+KP_Add');
    expect(toPortalTrigger('MediaPlayPause')).toBe('XF86AudioPlay');
    expect(toPortalTrigger('VolumeMute')).toBe('XF86AudioMute');
  });

  test('suggests nothing for keys or modifiers it has no name for', () => {
    expect(toPortalTrigger('Control+Unknown')).toBeUndefined();
    expect(toPortalTrigger('Hyper+L')).toBeUndefined();
    expect(toPortalTrigger('')).toBeUndefined();
  });
});
