import {
  getLocalStorageItem,
  getLocalStorageItemAsJSON,
  getLocalStorageItemBool,
  LocalStorageKey,
  setLocalStorageItem
} from '@/helpers/storage';
import { afterEach, describe, expect, it } from 'bun:test';

const original = globalThis.localStorage;

const breakStorage = () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('SecurityError');
    }
  });
};

afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: original,
    writable: true
  });
});

describe('storage', () => {
  it('falls back to defaults when storage access throws', () => {
    breakStorage();

    expect(getLocalStorageItem(LocalStorageKey.DEBUG)).toBeNull();
    expect(getLocalStorageItemBool(LocalStorageKey.DEBUG, true)).toBe(true);
    expect(
      getLocalStorageItemAsJSON(LocalStorageKey.RECENT_EMOJIS, [])
    ).toEqual([]);
    expect(() =>
      setLocalStorageItem(LocalStorageKey.DEBUG, 'true')
    ).not.toThrow();
  });

  it('falls back to the default when the stored json is corrupt', () => {
    setLocalStorageItem(LocalStorageKey.RECENT_EMOJIS, '{not json');

    expect(
      getLocalStorageItemAsJSON(LocalStorageKey.RECENT_EMOJIS, [])
    ).toEqual([]);
  });
});
