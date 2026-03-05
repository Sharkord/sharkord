import { describe, expect, test } from 'bun:test';
import { parse } from 'ini';
import { deepMerge } from '../deep-merge';

describe('deepMerge', () => {
  test('merges flat objects', () => {
    const target = { a: 1, b: 2 };
    const source = { b: 3 };

    expect(deepMerge(target, source)).toEqual({ a: 1, b: 3 });
  });

  test('adds new keys from source', () => {
    const target = { a: 1 } as Record<string, unknown>;
    const source = { b: 2 };

    expect(deepMerge(target, source)).toEqual({
      a: 1,
      b: 2
    });
  });

  test('deeply merges nested objects', () => {
    const target = {
      server: { port: 4991, debug: false },
      http: { maxFiles: 40 }
    };
    const source: Partial<typeof target> = {
      server: { port: 8080 }
    } as Partial<typeof target>;

    expect(deepMerge(target, source)).toEqual({
      server: { port: 8080, debug: false },
      http: { maxFiles: 40 }
    });
  });

  test('deeply merges multiple levels', () => {
    const target = {
      a: {
        b: {
          c: 1,
          d: 2
        },
        e: 3
      }
    };
    const source: Partial<typeof target> = {
      a: {
        b: {
          c: 99
        }
      }
    } as Partial<typeof target>;

    expect(deepMerge(target, source)).toEqual({
      a: {
        b: {
          c: 99,
          d: 2
        },
        e: 3
      }
    });
  });

  test('overwrites primitives with source values', () => {
    const target = { a: 'hello', b: 42, c: true };
    const source = { a: 'world', c: false };

    expect(deepMerge(target, source)).toEqual({
      a: 'world',
      b: 42,
      c: false
    });
  });

  test('does not mutate the target object', () => {
    const target = { a: 1, b: { c: 2 } };
    const source = { b: { c: 99 } };

    const result = deepMerge(target, source);

    expect(result).toEqual({ a: 1, b: { c: 99 } });
    expect(target).toEqual({ a: 1, b: { c: 2 } });
  });

  test('does not mutate the source object', () => {
    const target = { a: { b: 1, c: 2 } };
    const source = { a: { b: 99 } } as Partial<typeof target>;

    const originalSource = structuredClone(source);

    deepMerge(target, source);

    expect(source).toEqual(originalSource);
  });

  test('overwrites arrays instead of merging them', () => {
    const target = { items: [1, 2, 3] };
    const source = { items: [4, 5] };

    expect(deepMerge(target, source)).toEqual({ items: [4, 5] });
  });

  test('handles source overwriting object with primitive', () => {
    const target = { a: { nested: true } } as Record<string, unknown>;
    const source = { a: 'flat' };

    expect(deepMerge(target, source)).toEqual({ a: 'flat' });
  });

  test('skips undefined values in source', () => {
    const target = { a: 1, b: 2 };
    const source = { a: undefined };

    expect(deepMerge(target, source)).toEqual({ a: 1, b: 2 });
  });

  test('returns a copy when source is empty', () => {
    const target = { a: 1, b: { c: 2 } };
    const source = {};

    const result = deepMerge(target, source);

    expect(result).toEqual(target);
    expect(result).not.toBe(target);
  });

  test('works with the config.ini merge use case', () => {
    const defaultConfig = {
      server: { port: 4991, debug: false, autoupdate: false },
      http: { maxFiles: 40, maxFileSize: 100 },
      mediasoup: { webrtcPort: 40000, announcedAddress: '' }
    };

    const existingConfig: Partial<typeof defaultConfig> = {
      server: { port: 5000, debug: true },
      mediasoup: { webrtcPort: 50000 }
    } as Partial<typeof defaultConfig>;

    const result = deepMerge(defaultConfig, existingConfig);

    expect(result).toEqual({
      server: { port: 5000, debug: true, autoupdate: false },
      http: { maxFiles: 40, maxFileSize: 100 },
      mediasoup: { webrtcPort: 50000, announcedAddress: '' }
    });
  });

  test('handles null-prototype objects (e.g. from ini.parse)', () => {
    const target = { a: 1, b: 2 };
    const source = Object.create(null);

    source.a = 10;

    expect(deepMerge(target, source)).toEqual({ a: 10, b: 2 });
  });

  test('deeply merges nested null-prototype objects', () => {
    const target = {
      section: { port: 4991, debug: false, maxBitrate: 30000000 }
    };

    const source = Object.create(null);

    source.section = Object.create(null);
    source.section.port = 5000;
    source.section.debug = true;

    const result = deepMerge(target, source);

    expect(result).toEqual({
      section: { port: 5000, debug: true, maxBitrate: 30000000 }
    });
  });

  test('preserves new default keys when existing config lacks them (ini.parse scenario)', () => {
    const defaultConfig = {
      server: { port: 4991, debug: false, autoupdate: false },
      webRtc: { port: 40000, announcedAddress: '', maxBitrate: 30000000 },
      rateLimiters: {
        sendAndEditMessage: { maxRequests: 15, windowMs: 60000 }
      }
    };

    // simulate an old config.ini that was written before maxBitrate existed
    const existingConfig = Object.create(null);

    existingConfig.server = Object.create(null);
    existingConfig.server.port = '5000';
    existingConfig.server.debug = true;
    existingConfig.server.autoupdate = false;
    existingConfig.webRtc = Object.create(null);
    existingConfig.webRtc.port = '40000';
    existingConfig.webRtc.announcedAddress = '';
    existingConfig.rateLimiters = Object.create(null);
    existingConfig.rateLimiters.sendAndEditMessage = Object.create(null);
    existingConfig.rateLimiters.sendAndEditMessage.maxRequests = '15';
    existingConfig.rateLimiters.sendAndEditMessage.windowMs = '60000';

    const result = deepMerge(defaultConfig, existingConfig);

    // maxBitrate should be preserved from default even though it wasn't in existing
    expect(result.webRtc.maxBitrate).toBe(30000000);
    // @ts-expect-error ini.parse returns all values as strings - zod will coerce them to the correct types when we parse the merged config, but deepMerge should just merge as-is
    expect(result.server.port).toBe('5000');
    expect(result.server.debug).toBe(true);
    // @ts-expect-error ini.parse returns all values as strings - zod will coerce them to the correct types when we parse the merged config, but deepMerge should just merge as-is
    expect(result.webRtc.port).toBe('40000');
  });

  test('works with real ini.parse output', async () => {
    const defaultConfig = {
      webRtc: { port: 40000, announcedAddress: '', maxBitrate: 30000000 }
    };

    // config file written before maxBitrate was added
    const oldIniContent = '[webRtc]\nport=40000\nannouncedAddress=\n';
    const existingConfig = parse(oldIniContent);

    const result = deepMerge(defaultConfig, existingConfig);

    expect(result.webRtc.maxBitrate).toBe(30000000);
    // @ts-expect-error ini.parse returns all values as strings - zod will coerce them to the correct types when we parse the merged config, but deepMerge should just merge as-is
    expect(result.webRtc.port).toBe('40000');
    expect(result.webRtc.announcedAddress).toBe('');
  });

  test('handles mix of null-prototype and regular objects', () => {
    const target = { a: { b: 1, c: 2 }, d: 3 };
    const source = Object.create(null);

    source.a = { b: 10 }; // regular object inside null-prototype parent

    const result = deepMerge(target, source);

    expect(result).toEqual({ a: { b: 10, c: 2 }, d: 3 });
  });

  test('new top-level section in default is preserved when absent from existing', () => {
    const defaultConfig = {
      existing: { key: 'value' },
      newSection: { newKey: 42 }
    };

    const existingConfig = Object.create(null);

    existingConfig.existing = Object.create(null);
    existingConfig.existing.key = 'customValue';

    const result = deepMerge(defaultConfig, existingConfig);

    expect(result.existing.key).toBe('customValue');
    expect(result.newSection).toEqual({ newKey: 42 });
  });
});
