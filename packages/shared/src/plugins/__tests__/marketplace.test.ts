import { describe, expect, test } from 'bun:test';
import { parseMarketplaceRegistry, zMarketplaceEntry } from '../marketplace';

// the registry is remote json that neither the client nor the server controls, and it used to
// be consumed with a bare `as` cast. homepage is rendered into an <a href> in a list an admin
// browses before installing anything, and downloadUrl is fetched by the server

const validEntry = {
  plugin: {
    id: 'music-bot',
    name: 'Music Bot',
    description: 'Streams music.',
    author: 'Someone',
    logo: 'https://example.com/logo.png',
    homepage: 'https://github.com/example/music-bot',
    tags: [],
    categories: [],
    verified: true,
    screenshots: ['https://example.com/1.png']
  },
  versions: [
    {
      version: '0.0.2',
      downloadUrl: 'https://github.com/example/music-bot/releases/x.tar.gz',
      checksum: 'abc123',
      sdkVersion: 1,
      size: 1372160,
      timestamp: 1775957590667
    }
  ]
};

describe('zMarketplaceEntry', () => {
  test('should accept an entry in the shape the live registry uses', () => {
    expect(zMarketplaceEntry.parse(validEntry)).toMatchObject({
      plugin: { id: 'music-bot' }
    });
  });

  // the same shape the manifest declares, so the two cannot drift
  test('should require sdkVersion to be a non-negative integer', () => {
    expect(zMarketplaceEntry.parse(validEntry).versions[0]!.sdkVersion).toBe(1);

    for (const sdkVersion of ['1', 1.5, -1]) {
      const entry = {
        ...validEntry,
        versions: [{ ...validEntry.versions[0], sdkVersion }]
      };

      expect(zMarketplaceEntry.safeParse(entry).success).toBe(false);
    }
  });

  test('should reject a javascript: homepage', () => {
    // this is the finding: an admin browsing the marketplace would render this into an
    // href without ever installing the plugin
    const entry = {
      ...validEntry,
      plugin: { ...validEntry.plugin, homepage: 'javascript:alert(1)' }
    };

    expect(zMarketplaceEntry.safeParse(entry).success).toBe(false);
  });

  test('should reject non-http logos and screenshots', () => {
    expect(
      zMarketplaceEntry.safeParse({
        ...validEntry,
        plugin: { ...validEntry.plugin, logo: 'javascript:alert(1)' }
      }).success
    ).toBe(false);

    expect(
      zMarketplaceEntry.safeParse({
        ...validEntry,
        plugin: {
          ...validEntry.plugin,
          screenshots: ['data:text/html,<script>alert(1)</script>']
        }
      }).success
    ).toBe(false);
  });

  test('should require https for downloadUrl', () => {
    // fetched by the server, so a plaintext or non-http scheme is refused before the
    // checksum check ever runs
    for (const downloadUrl of [
      'http://example.com/p.tar.gz',
      'file:///etc/passwd',
      'ftp://example.com/p.tar.gz'
    ]) {
      const entry = {
        ...validEntry,
        versions: [{ ...validEntry.versions[0], downloadUrl }]
      };

      expect(zMarketplaceEntry.safeParse(entry).success).toBe(false);
    }
  });

  test('should reject a plugin id that could escape the plugins directory', () => {
    const entry = {
      ...validEntry,
      plugin: { ...validEntry.plugin, id: '../escape' }
    };

    expect(zMarketplaceEntry.safeParse(entry).success).toBe(false);
  });
});

describe('parseMarketplaceRegistry', () => {
  test('should return the entries it can parse', () => {
    expect(parseMarketplaceRegistry([validEntry])).toHaveLength(1);
  });

  test('should drop a malformed entry instead of failing the whole registry', () => {
    const poisoned = {
      ...validEntry,
      plugin: {
        ...validEntry.plugin,
        id: 'evil',
        homepage: 'javascript:alert(1)'
      }
    };

    const parsed = parseMarketplaceRegistry([validEntry, poisoned, validEntry]);

    expect(parsed).toHaveLength(2);
    expect(parsed.every((entry) => entry.plugin.id === 'music-bot')).toBe(true);
  });

  test('should reject a payload that is not an array', () => {
    expect(() => parseMarketplaceRegistry({ plugins: [] })).toThrow();
    expect(() => parseMarketplaceRegistry(null)).toThrow();
  });

  test('should return nothing for an empty registry', () => {
    expect(parseMarketplaceRegistry([])).toEqual([]);
  });
});
