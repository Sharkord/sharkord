import { MARKETPLACE_REGISTRY_URL } from '@sharkord/shared';
import { afterEach, describe, expect, test } from 'bun:test';
import { fetchMarketplaceVersion } from '../marketplace';

const realFetch = globalThis.fetch;

const entry = (id: string, version: string = '1.0.0') => ({
  plugin: {
    id,
    name: id,
    description: 'a plugin',
    author: 'someone',
    logo: 'https://example.com/logo.png',
    verified: true
  },
  versions: [
    {
      version,
      downloadUrl: 'https://example.com/plugin.tar.gz',
      checksum: 'deadbeef',
      sdkVersion: 1,
      size: 1000,
      timestamp: 1
    }
  ]
});

const serveRegistry = (body: unknown, ok: boolean = true) => {
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
    expect(String(input)).toBe(MARKETPLACE_REGISTRY_URL);

    return {
      ok,
      json: async () => body
    } as Response;
  }) as typeof fetch;
};

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('fetchMarketplaceVersion', () => {
  test('should return the requested version of a listed plugin', async () => {
    serveRegistry([entry('plugin-example')]);

    const version = await fetchMarketplaceVersion('plugin-example', '1.0.0');

    expect(version.downloadUrl).toBe('https://example.com/plugin.tar.gz');
    expect(version.checksum).toBe('deadbeef');
  });

  // the schema drops bad entries rather than failing the whole registry, so an entry that does
  // not parse is simply not there. installing it has to fail like any unknown plugin, which is
  // what makes a plugin "silently missing from the list" the visible symptom of a schema failure
  test('should not find a plugin whose entry failed the schema', async () => {
    const poisoned = entry('plugin-poisoned');

    poisoned.plugin.logo = 'javascript:alert(1)';

    serveRegistry([entry('plugin-example'), poisoned]);

    await expect(
      fetchMarketplaceVersion('plugin-poisoned', '1.0.0')
    ).rejects.toThrow("Plugin 'plugin-poisoned' not found in marketplace");

    // the valid entry alongside it still installs, so one bad row cannot take the rest down
    await expect(
      fetchMarketplaceVersion('plugin-example', '1.0.0')
    ).resolves.toBeDefined();
  });

  test('should refuse a plugin that is not listed at all', async () => {
    serveRegistry([entry('plugin-example')]);

    await expect(
      fetchMarketplaceVersion('plugin-missing', '1.0.0')
    ).rejects.toThrow("Plugin 'plugin-missing' not found in marketplace");
  });

  test('should refuse a version the listed plugin does not have', async () => {
    serveRegistry([entry('plugin-example', '1.0.0')]);

    await expect(
      fetchMarketplaceVersion('plugin-example', '2.0.0')
    ).rejects.toThrow("Version '2.0.0' not found for plugin 'plugin-example'");
  });

  test('should refuse a registry the host did not serve', async () => {
    serveRegistry([], false);

    await expect(
      fetchMarketplaceVersion('plugin-example', '1.0.0')
    ).rejects.toThrow('Failed to fetch marketplace registry');
  });
});
