import { describe, expect, test } from 'bun:test';
import { getPluginIdFromBundleUrl } from '../client-sdk';

describe('getPluginIdFromBundleUrl', () => {
  test('should read the plugin id out of a bundle url', () => {
    expect(
      getPluginIdFromBundleUrl(
        'https://chat.example.com/plugin-bundle/music-bot/client/index.js'
      )
    ).toBe('music-bot');
  });

  // the client appends the plugin version to bust the module cache
  test('should ignore a query string and a fragment', () => {
    expect(
      getPluginIdFromBundleUrl(
        'https://chat.example.com/plugin-bundle/music-bot/client/index.js?v=1.2.3'
      )
    ).toBe('music-bot');

    expect(
      getPluginIdFromBundleUrl(
        'https://chat.example.com/plugin-bundle/music-bot/client/index.js#x'
      )
    ).toBe('music-bot');
  });

  test('should work behind a path prefix and on a non default port', () => {
    expect(
      getPluginIdFromBundleUrl(
        'http://localhost:3000/plugin-bundle/iptv/client/index.js'
      )
    ).toBe('iptv');
  });

  test('should decode a percent encoded id', () => {
    expect(
      getPluginIdFromBundleUrl('/plugin-bundle/my%2Dplugin/client/index.js')
    ).toBe('my-plugin');
  });

  test('should return undefined for anything that is not a bundle url', () => {
    for (const url of [
      'file:///home/user/project/dist/index.js',
      'https://chat.example.com/assets/app.js',
      'https://chat.example.com/plugin-bundle/',
      ''
    ]) {
      expect(getPluginIdFromBundleUrl(url)).toBeUndefined();
    }
  });

  test('should return undefined rather than throw on a malformed escape', () => {
    expect(
      getPluginIdFromBundleUrl('/plugin-bundle/%E0%A4%A/client/index.js')
    ).toBeUndefined();
  });
});
