import type { TPluginHttpMethod } from '@sharkord/plugin-sdk';
import { describe, expect, test } from 'bun:test';
import { PluginHttpRouteRegistry } from '../http-route-registry';
import { PluginLogger } from '../plugin-logger';

// registration validation is a pure function, so it is covered here rather than
// through a mock plugin. the load path that turns these throws into a plugin
// loadError is covered by plugin-http-fails-load in http/__tests__/plugin-routes.test.ts
describe('PluginHttpRouteRegistry', () => {
  const noop = () => {};

  const createRegistry = () => new PluginHttpRouteRegistry(new PluginLogger());

  test('rejects unsupported HTTP methods', () => {
    expect(() =>
      createRegistry().register(
        'plugin-a',
        'PUT' as TPluginHttpMethod,
        '/invalid',
        noop
      )
    ).toThrow("HTTP method 'PUT' is not supported.");
  });

  test('rejects route paths without a leading slash', () => {
    expect(() =>
      createRegistry().register('plugin-a', 'GET', 'missing-slash', noop)
    ).toThrow("HTTP route path 'missing-slash' must start with '/'.");
  });

  test('rejects wildcards outside the final segment', () => {
    expect(() =>
      createRegistry().register('plugin-a', 'GET', '/foo/*/bar', noop)
    ).toThrow(
      "HTTP route path '/foo/*/bar' can only use '*' as the final segment."
    );
  });

  test('rejects more than one wildcard', () => {
    expect(() =>
      createRegistry().register('plugin-a', 'GET', '/foo/*/*', noop)
    ).toThrow("can only use '*' as the final segment.");
  });

  test('unload drops every route for the plugin', () => {
    const registry = createRegistry();

    registry.register('plugin-a', 'GET', '/kept', noop);
    registry.register('plugin-b', 'GET', '/dropped', noop);
    registry.unload('plugin-b');

    expect(registry.get('plugin-a', 'GET', '/kept')?.handler).toBe(noop);
    expect(registry.get('plugin-b', 'GET', '/dropped')).toBeUndefined();
  });
});
