import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { applyEnvOverrides } from '../apply-env-overrides';

describe('applyEnvOverrides', () => {
  const savedEnv: Record<string, string | undefined> = {};

  const setEnv = (key: string, value: string) => {
    savedEnv[key] = process.env[key];

    process.env[key] = value;
  };

  beforeEach(() => {
    for (const key of Object.keys(savedEnv)) {
      delete savedEnv[key];
    }
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  test('overrides a top-level numeric value', () => {
    setEnv('TEST_PORT', '8080');

    const config = { server: { port: 4991 } };
    const overridesMap = { 'server.port': 'TEST_PORT' };

    const result = applyEnvOverrides(config, overridesMap);

    expect(result.server.port).toBe(8080);
  });

  test('overrides a top-level boolean value', () => {
    setEnv('TEST_DEBUG', 'true');

    const config = { server: { debug: false } };
    const overridesMap = { 'server.debug': 'TEST_DEBUG' };

    const result = applyEnvOverrides(config, overridesMap);

    expect(result.server.debug).toBe(true);
  });

  test('overrides a deeply nested value', () => {
    setEnv('TEST_RTC_PORT', '50000');

    const config = { mediasoup: { webrtcPort: 40000 } };
    const overridesMap = { 'mediasoup.webrtcPort': 'TEST_RTC_PORT' };

    const result = applyEnvOverrides(config, overridesMap);

    expect(result.mediasoup.webrtcPort).toBe(50000);
  });

  test('uses string value when JSON.parse fails', () => {
    setEnv('TEST_NAME', 'hello world');

    const config = { app: { name: 'default' } };
    const overridesMap = { 'app.name': 'TEST_NAME' };

    const result = applyEnvOverrides(config, overridesMap);

    expect(result.app.name).toBe('hello world');
  });

  test('does not override when env variable is not set', () => {
    const config = { server: { port: 4991 } };
    const overridesMap = { 'server.port': 'NONEXISTENT_ENV_VAR' };

    const result = applyEnvOverrides(config, overridesMap);

    expect(result.server.port).toBe(4991);
  });

  test('does not override when env variable is empty string', () => {
    setEnv('TEST_EMPTY', '');

    const config = { server: { port: 4991 } };
    const overridesMap = { 'server.port': 'TEST_EMPTY' };

    const result = applyEnvOverrides(config, overridesMap);

    expect(result.server.port).toBe(4991);
  });

  test('handles multiple overrides at once', () => {
    setEnv('TEST_PORT', '9000');
    setEnv('TEST_DEBUG', 'true');

    const config = { server: { port: 4991, debug: false } };
    const overridesMap = {
      'server.port': 'TEST_PORT',
      'server.debug': 'TEST_DEBUG'
    };

    const result = applyEnvOverrides(config, overridesMap);

    expect(result.server.port).toBe(9000);
    expect(result.server.debug).toBe(true);
  });

  test('does not mutate the original config', () => {
    setEnv('TEST_PORT', '8080');

    const config = { server: { port: 4991 } };
    const overridesMap = { 'server.port': 'TEST_PORT' };

    const result = applyEnvOverrides(config, overridesMap);

    expect(result.server.port).toBe(8080);
    expect(config.server.port).toBe(4991);
  });

  test('parses JSON array values', () => {
    setEnv('TEST_ITEMS', '[1,2,3]');

    const config = { data: { items: [] as number[] } };
    const overridesMap = { 'data.items': 'TEST_ITEMS' };

    const result = applyEnvOverrides(config, overridesMap);

    expect(result.data.items).toEqual([1, 2, 3]);
  });

  test('parses JSON object values', () => {
    setEnv('TEST_OBJ', '{"key":"value"}');

    const config = { data: { meta: {} as Record<string, string> } };
    const overridesMap = { 'data.meta': 'TEST_OBJ' };

    const result = applyEnvOverrides(config, overridesMap);

    expect(result.data.meta).toEqual({ key: 'value' });
  });

  test('works with the full config overrides map', () => {
    setEnv('SHARKORD_PORT_TEST', '5000');
    setEnv('SHARKORD_DEBUG_TEST', 'false');
    setEnv('SHARKORD_WEBRTC_PORT_TEST', '50000');

    const config = {
      server: { port: 4991, debug: true, autoupdate: false },
      http: { maxFiles: 40, maxFileSize: 100 },
      mediasoup: { webrtcPort: 40000, announcedAddress: '' }
    };

    const overridesMap = {
      'server.port': 'SHARKORD_PORT_TEST',
      'server.debug': 'SHARKORD_DEBUG_TEST',
      'mediasoup.webrtcPort': 'SHARKORD_WEBRTC_PORT_TEST',
      'mediasoup.announcedAddress': 'SHARKORD_ANNOUNCED_ADDRESS_TEST'
    };

    const result = applyEnvOverrides(config, overridesMap);

    expect(result.server.port).toBe(5000);
    expect(result.server.debug).toBe(false);
    expect(result.server.autoupdate).toBe(false);
    expect(result.http.maxFiles).toBe(40);
    expect(result.http.maxFileSize).toBe(100);
    expect(result.mediasoup.webrtcPort).toBe(50000);
    expect(result.mediasoup.announcedAddress).toBe('');
  });
});
