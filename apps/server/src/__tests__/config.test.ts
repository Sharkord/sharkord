import { afterEach, describe, expect, test } from 'bun:test';
import { defaultConfig, envOverridesMap, zConfig } from '../config';
import { applyEnvOverrides } from '../helpers/apply-env-overrides';

// applyEnvOverrides deliberately does no validation of its own: it drops whatever the env var
// says into the config object. what stops a bad value reaching the running server is the
// zConfig.parse wrapped around it in config.ts, and that pairing is what these cover. the
// real envOverridesMap is used rather than a copy, so a renamed variable fails here too
const applyOverrides = () =>
  zConfig.parse(applyEnvOverrides(defaultConfig, envOverridesMap));

// the default is what almost every deployment runs, and widening it by one entry is how a
// forwarded header from a public client silently becomes trusted
describe('trustedProxies default', () => {
  test('should trust the addresses a reverse proxy reaches us from', () => {
    expect(defaultConfig.server.trustedProxies).toEqual([
      '127.0.0.1',
      '::1',
      '10.0.0.0/8',
      '172.16.0.0/12',
      '192.168.0.0/16',
      'fc00::/7'
    ]);
  });

  test('should not trust a public address', () => {
    const publicRanges = ['0.0.0.0/0', '::/0'];

    for (const entry of defaultConfig.server.trustedProxies) {
      expect(publicRanges).not.toContain(entry);
    }
  });
});

describe('backupDatabase default', () => {
  test('should be on, since it is the only thing that makes a bad migration recoverable', () => {
    expect(defaultConfig.server.backupDatabase).toBe(true);
  });
});

describe('env overrides are validated', () => {
  const savedEnv: Record<string, string | undefined> = {};

  const setEnv = (key: string, value: string) => {
    if (!(key in savedEnv)) savedEnv[key] = process.env[key];

    process.env[key] = value;
  };

  afterEach(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }

      delete savedEnv[key];
    }
  });

  test('should accept a valid override', () => {
    setEnv('SHARKORD_PORT', '8080');

    expect(applyOverrides().server.port).toBe(8080);
  });

  test('should reject a port that is not a number', () => {
    setEnv('SHARKORD_PORT', 'not-a-port');

    expect(applyOverrides).toThrow();
  });

  test('should turn the database backup off from the env', () => {
    setEnv('SHARKORD_BACKUP_DATABASE', 'false');

    expect(applyOverrides().server.backupDatabase).toBe(false);
  });

  test('should reject a port outside the allowed range', () => {
    setEnv('SHARKORD_PORT', '-1');

    expect(applyOverrides).toThrow();

    setEnv('SHARKORD_PORT', '0');

    expect(applyOverrides).toThrow();
  });

  test('should reject a fractional port', () => {
    setEnv('SHARKORD_PORT', '80.5');

    expect(applyOverrides).toThrow();
  });

  test('should reject a structurally wrong value', () => {
    // JSON.parse succeeds here, so the value reaches the schema as an object
    setEnv('SHARKORD_PORT', '{"nested":true}');

    expect(applyOverrides).toThrow();
  });

  test('should reject an invalid webRtc override', () => {
    setEnv('SHARKORD_WEBRTC_MAX_BITRATE', '0');

    expect(applyOverrides).toThrow();
  });

  test('should coerce a comma separated list into an array', () => {
    setEnv('SHARKORD_TRUSTED_PROXIES', '10.0.0.1,10.0.0.2');

    expect(applyOverrides().server.trustedProxies).toEqual([
      '10.0.0.1',
      '10.0.0.2'
    ]);
  });

  test('should reject a list whose entries are empty', () => {
    setEnv('SHARKORD_ALLOWED_ORIGINS', ',');

    expect(applyOverrides).toThrow();
  });

  test('should leave the config untouched when no variable is set', () => {
    expect(applyOverrides()).toEqual(zConfig.parse(defaultConfig));
  });

  test('should not mutate defaultConfig', () => {
    setEnv('SHARKORD_PORT', '8080');

    applyOverrides();

    expect(defaultConfig.server.port).toBe(4991);
  });
});
