import { describe, expect, test } from 'bun:test';
import {
  PLUGIN_SDK_VERSION,
  zParsedDomCommand,
  zPluginId,
  zPluginManifest
} from '..';

// these three schemas are the validation gates the plugin subsystem runs on. zPluginManifest
// parses every manifest.json at install (helpers/downloads.ts) and at load (plugins/index.ts),
// zPluginId validates the id on every plugin route, and zParsedDomCommand parses commands back
// out of message html. none of them had tests

const validManifest = {
  id: 'my-plugin',
  name: 'My Plugin',
  author: 'Someone',
  description: 'Does a thing',
  sdkVersion: PLUGIN_SDK_VERSION,
  version: '1.0.0'
};

describe('zPluginId', () => {
  test('should accept lowercase letters, numbers and dashes', () => {
    expect(zPluginId.parse('my-plugin')).toBe('my-plugin');
    expect(zPluginId.parse('plugin2')).toBe('plugin2');
    expect(zPluginId.parse('a')).toBe('a');
  });

  test('should reject an empty id', () => {
    expect(() => zPluginId.parse('')).toThrow();
  });

  test('should reject uppercase, spaces and underscores', () => {
    expect(() => zPluginId.parse('MyPlugin')).toThrow();
    expect(() => zPluginId.parse('my plugin')).toThrow();
    expect(() => zPluginId.parse('my_plugin')).toThrow();
  });

  test('should reject characters that could escape a directory', () => {
    // the id is joined onto PLUGINS_PATH, so this is the schema standing between a manifest
    // and a path traversal
    expect(() => zPluginId.parse('../evil')).toThrow();
    expect(() => zPluginId.parse('a/b')).toThrow();
    expect(() => zPluginId.parse('.')).toThrow();
    expect(() => zPluginId.parse('..')).toThrow();
    expect(() => zPluginId.parse('a\\b')).toThrow();
    expect(() => zPluginId.parse('plugin\0')).toThrow();
  });
});

describe('zPluginManifest', () => {
  test('should accept a minimal valid manifest', () => {
    expect(zPluginManifest.parse(validManifest)).toMatchObject(validManifest);
  });

  test('should accept optional homepage and logo when they are urls', () => {
    const parsed = zPluginManifest.parse({
      ...validManifest,
      homepage: 'https://example.com',
      logo: 'https://example.com/logo.png'
    });

    expect(parsed.homepage).toBe('https://example.com');
    expect(parsed.logo).toBe('https://example.com/logo.png');
  });

  test('should reject a non-url homepage or logo', () => {
    expect(() =>
      zPluginManifest.parse({ ...validManifest, homepage: 'not-a-url' })
    ).toThrow();
  });

  test('should reject non-http schemes in homepage and logo', () => {
    // homepage is rendered into an <a href> in the plugin list, so a javascript: url here
    // is a clickable script execution. z.url() on its own accepts any scheme
    for (const url of [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'file:///etc/passwd'
    ]) {
      expect(() =>
        zPluginManifest.parse({ ...validManifest, homepage: url })
      ).toThrow();
      expect(() =>
        zPluginManifest.parse({ ...validManifest, logo: url })
      ).toThrow();
    }
  });

  test('should require every mandatory field', () => {
    for (const field of [
      'id',
      'name',
      'author',
      'description',
      'sdkVersion',
      'version'
    ]) {
      const incomplete: Record<string, unknown> = { ...validManifest };

      delete incomplete[field];

      expect(() => zPluginManifest.parse(incomplete)).toThrow();
    }
  });

  test('should reject empty strings in the required text fields', () => {
    expect(() =>
      zPluginManifest.parse({ ...validManifest, name: '' })
    ).toThrow();
    expect(() =>
      zPluginManifest.parse({ ...validManifest, author: '' })
    ).toThrow();
    expect(() =>
      zPluginManifest.parse({ ...validManifest, description: '' })
    ).toThrow();
  });

  test('should reject an invalid plugin id inside the manifest', () => {
    expect(() =>
      zPluginManifest.parse({ ...validManifest, id: '../escape' })
    ).toThrow();
  });

  test('should accept semver with a prerelease suffix', () => {
    expect(
      zPluginManifest.parse({ ...validManifest, version: '1.2.3-beta.1' })
        .version
    ).toBe('1.2.3-beta.1');
    expect(
      zPluginManifest.parse({ ...validManifest, version: '0.0.1-rc-2' }).version
    ).toBe('0.0.1-rc-2');
  });

  test('should reject versions that are not semver', () => {
    for (const version of ['1', '1.0', 'v1.0.0', '1.0.0.0', 'latest', '']) {
      expect(() =>
        zPluginManifest.parse({ ...validManifest, version })
      ).toThrow();
    }
  });

  test('should reject an sdkVersion that is not a non-negative integer', () => {
    for (const sdkVersion of [-1, 1.5, '1', null]) {
      expect(() =>
        zPluginManifest.parse({ ...validManifest, sdkVersion })
      ).toThrow();
    }
  });

  test('should strip unknown fields rather than carry them through', () => {
    const parsed = zPluginManifest.parse({
      ...validManifest,
      somethingElse: 'ignored'
    });

    expect('somethingElse' in parsed).toBe(false);
  });
});

describe('zParsedDomCommand', () => {
  const validCommand = {
    pluginId: 'my-plugin',
    commandName: 'do-thing',
    args: [{ name: 'target', value: 'x' }]
  };

  test('should default status to pending', () => {
    expect(zParsedDomCommand.parse(validCommand).status).toBe('pending');
  });

  test('should accept the three known statuses and reject others', () => {
    const statuses = ['pending', 'completed', 'failed'] as const;

    for (const status of statuses) {
      expect(zParsedDomCommand.parse({ ...validCommand, status }).status).toBe(
        status
      );
    }

    expect(() =>
      zParsedDomCommand.parse({ ...validCommand, status: 'running' })
    ).toThrow();
  });

  test('should require a plugin id and a command name', () => {
    expect(() =>
      zParsedDomCommand.parse({ ...validCommand, commandName: '' })
    ).toThrow();
    expect(() =>
      zParsedDomCommand.parse({ ...validCommand, pluginId: 'Bad Id' })
    ).toThrow();
  });

  test('should accept an empty args list', () => {
    expect(zParsedDomCommand.parse({ ...validCommand, args: [] }).args).toEqual(
      []
    );
  });

  test('should reject a non-http logo', () => {
    expect(() =>
      zParsedDomCommand.parse({ ...validCommand, logo: 'javascript:alert(1)' })
    ).toThrow();
    expect(
      zParsedDomCommand.parse({
        ...validCommand,
        logo: 'https://example.com/l.png'
      }).logo
    ).toBe('https://example.com/l.png');
  });

  test('should reject args that are not the expected shape', () => {
    expect(() =>
      zParsedDomCommand.parse({ ...validCommand, args: [{ value: 'x' }] })
    ).toThrow();
    expect(() =>
      zParsedDomCommand.parse({ ...validCommand, args: 'target=x' })
    ).toThrow();
  });
});
