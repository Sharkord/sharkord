import { describe, expect, test } from 'bun:test';
import { getDesktopMismatch } from '../desktop';

describe('getDesktopMismatch', () => {
  test('should report no mismatch when the versions are equal', () => {
    expect(getDesktopMismatch(3, 3)).toBeUndefined();
  });

  test('should blame the server when its client is older than the app', () => {
    expect(getDesktopMismatch(3, 2)).toBe('server-outdated');
  });

  test('should blame the app when it is older than the server client', () => {
    expect(getDesktopMismatch(3, 4)).toBe('app-outdated');
  });
});
