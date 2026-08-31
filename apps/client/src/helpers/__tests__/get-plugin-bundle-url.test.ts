import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { getPluginBundleUrl } from '../get-plugin-bundle-url';

describe('getPluginBundleUrl', () => {
  // outside development the base url comes from the page the client is served on
  beforeAll(() => {
    globalThis.window = {
      location: { host: 'chat.example.com', protocol: 'https:' }
    } as never;
  });

  afterAll(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  test('should point at the plugin client entry', () => {
    expect(getPluginBundleUrl('music-bot', undefined)).toEndWith(
      '/plugin-bundle/music-bot/client/index.js'
    );
  });

  // the module registry keys on the specifier, so the version is what makes an
  // updated plugin actually re-import
  test('should carry the version when there is one', () => {
    expect(getPluginBundleUrl('music-bot', '1.2.3')).toEndWith(
      '/plugin-bundle/music-bot/client/index.js?v=1.2.3'
    );
  });

  test('should encode a version that is not url safe', () => {
    expect(getPluginBundleUrl('music-bot', '1.0.0+build/1')).toEndWith(
      '?v=1.0.0%2Bbuild%2F1'
    );
  });

  // the sdk reads the plugin id back out of this url, so the round trip has to hold
  test('should stay parseable back into the plugin id', async () => {
    const { getPluginIdFromBundleUrl } = await import('@sharkord/shared');

    expect(
      getPluginIdFromBundleUrl(getPluginBundleUrl('music-bot', '1.2.3'))
    ).toBe('music-bot');
  });
});
