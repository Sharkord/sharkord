import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import {
  getScreenShareTransport,
  setScreenShareTransport
} from '../screen-share-transport';

const originalLocalStorage = globalThis.localStorage;
const testStorage = new Map<string, string>();

beforeEach(() => {
  testStorage.clear();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => testStorage.get(key) ?? null,
      removeItem: (key: string) => testStorage.delete(key),
      setItem: (key: string, value: string) => testStorage.set(key, value)
    },
    writable: true
  });
});

afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: originalLocalStorage,
    writable: true
  });
});

describe('screen share transport', () => {
  it('defaults to direct when no choice has been saved', () => {
    expect(getScreenShareTransport()).toBe('direct');
  });

  it('remembers the selected transport', () => {
    setScreenShareTransport('server');

    expect(getScreenShareTransport()).toBe('server');

    setScreenShareTransport('direct');

    expect(getScreenShareTransport()).toBe('direct');
  });
});
