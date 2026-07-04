import { beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import fs from 'fs/promises';
import { loadMockedPlugins, resetPluginMocks } from '../../__tests__/mocks';
import { testsBaseUrl } from '../../__tests__/setup';
import { PLUGINS_PATH } from '../../helpers/paths';
import { pluginManager } from '../../plugins';

describe('/plugins/:pluginId/*', () => {
  beforeAll(async () => {
    await fs.mkdir(PLUGINS_PATH, { recursive: true });
    await loadMockedPlugins();
  });

  beforeEach(resetPluginMocks);

  const enableAndLoadPlugin = async (pluginId: string) => {
    await pluginManager.togglePlugin(pluginId, true);
  };

  test('serves plugin GET routes', async () => {
    await pluginManager.load('plugin-b');

    const response = await fetch(`${testsBaseUrl}/plugins/plugin-b/hello`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      pluginId: 'plugin-b',
      method: 'GET'
    });
  });

  test('serves plugin POST routes', async () => {
    await pluginManager.load('plugin-b');

    const response = await fetch(`${testsBaseUrl}/plugins/plugin-b/echo`, {
      method: 'POST',
      body: 'hello from plugin route'
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ body: 'hello from plugin route' });
  });

  test('serves plugin PATCH routes', async () => {
    await pluginManager.load('plugin-b');

    const response = await fetch(`${testsBaseUrl}/plugins/plugin-b/resource`, {
      method: 'PATCH'
    });

    expect(response.status).toBe(202);
    expect(response.headers.get('content-type')).toBe('text/plain');
    expect(await response.text()).toBe('patched');
  });

  test('serves plugin DELETE routes', async () => {
    await pluginManager.load('plugin-b');

    const response = await fetch(`${testsBaseUrl}/plugins/plugin-b/resource`, {
      method: 'DELETE'
    });

    expect(response.status).toBe(204);
  });

  test('serves plugin OPTIONS routes', async () => {
    await pluginManager.load('plugin-b');

    const response = await fetch(`${testsBaseUrl}/plugins/plugin-b/cors`, {
      method: 'OPTIONS'
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('allow')).toBe('POST, OPTIONS');
    expect(await response.text()).toBe('plugin options');
  });

  test('preserves generic OPTIONS fallback when plugin route is not registered', async () => {
    await pluginManager.load('plugin-b');

    const response = await fetch(`${testsBaseUrl}/plugins/plugin-b/hello`, {
      method: 'OPTIONS'
    });

    expect(response.status).toBe(204);
  });

  test('supports raw text bodies, headers, custom responses, and wildcard paths', async () => {
    await pluginManager.load('plugin-b');

    const body = 'v=0\no=- 0 0 IN IP4 127.0.0.1\ns=plugin stream';
    const response = await fetch(
      `${testsBaseUrl}/plugins/plugin-b/sdp/stream-123?session=abc`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer obs-token',
          'Content-Type': 'application/sdp'
        },
        body
      }
    );

    expect(response.status).toBe(201);
    expect(response.headers.get('content-type')).toBe('application/sdp');
    expect(response.headers.get('location')).toBe(
      '/plugins/plugin-b/sdp/stream-123?session=abc'
    );
    expect(response.headers.get('etag')).toBe('"plugin-sdp"');

    const responseText = await response.text();

    expect(responseText).toContain('method=POST');
    expect(responseText).toContain('authorization=Bearer obs-token');
    expect(responseText).toContain('content-type=application/sdp');
    expect(responseText).toContain(
      'url=/plugins/plugin-b/sdp/stream-123?session=abc'
    );
    expect(responseText).toContain(body);
  });

  test('returns 404 after plugin unload', async () => {
    await pluginManager.load('plugin-b');
    await pluginManager.unload('plugin-b');

    const response = await fetch(`${testsBaseUrl}/plugins/plugin-b/hello`);

    expect(response.status).toBe(404);
  });

  test('returns 404 after plugin is disabled', async () => {
    await pluginManager.load('plugin-b');
    await pluginManager.togglePlugin('plugin-b', false);

    const response = await fetch(`${testsBaseUrl}/plugins/plugin-b/hello`);

    expect(response.status).toBe(404);
  });

  test('does not serve routes registered before a failed load', async () => {
    await enableAndLoadPlugin('plugin-http-fails-load');

    const info = await pluginManager.getPluginInfo('plugin-http-fails-load');

    expect(info.loadError).toContain('Intentional HTTP route load failure');

    const response = await fetch(
      `${testsBaseUrl}/plugins/plugin-http-fails-load/leaked`
    );

    expect(response.status).toBe(404);
  });

  test('serves plugin root routes', async () => {
    await enableAndLoadPlugin('plugin-http-routes');

    const response = await fetch(`${testsBaseUrl}/plugins/plugin-http-routes`);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('root');
  });

  test('uses the latest handler for duplicate registrations', async () => {
    await enableAndLoadPlugin('plugin-http-routes');

    const response = await fetch(
      `${testsBaseUrl}/plugins/plugin-http-routes/duplicate`
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('second');
  });

  test('prefers exact routes over wildcard routes', async () => {
    await enableAndLoadPlugin('plugin-http-routes');

    const response = await fetch(
      `${testsBaseUrl}/plugins/plugin-http-routes/wild/exact`
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('exact');
  });

  test('uses the longest matching wildcard route', async () => {
    await enableAndLoadPlugin('plugin-http-routes');

    const response = await fetch(
      `${testsBaseUrl}/plugins/plugin-http-routes/api/v1/users`
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('api-v1');
  });

  test('matches wildcard routes at the wildcard parent path', async () => {
    await enableAndLoadPlugin('plugin-http-routes');

    const response = await fetch(
      `${testsBaseUrl}/plugins/plugin-http-routes/wild`
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('wildcard');
  });

  test('returns 500 when a plugin route handler throws', async () => {
    await enableAndLoadPlugin('plugin-http-routes');

    const response = await fetch(
      `${testsBaseUrl}/plugins/plugin-http-routes/throws`
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal server error' });
  });

  test('rejects unsupported HTTP methods during registration', async () => {
    await enableAndLoadPlugin('plugin-http-invalid-method');

    const info = await pluginManager.getPluginInfo(
      'plugin-http-invalid-method'
    );

    expect(info.loadError).toContain("HTTP method 'PUT' is not supported");
  });

  test('rejects route paths without a leading slash', async () => {
    await enableAndLoadPlugin('plugin-http-invalid-path');

    const info = await pluginManager.getPluginInfo('plugin-http-invalid-path');

    expect(info.loadError).toContain("must start with '/'");
  });

  test('rejects wildcard routes outside the final segment', async () => {
    await enableAndLoadPlugin('plugin-http-invalid-wildcard');

    const info = await pluginManager.getPluginInfo(
      'plugin-http-invalid-wildcard'
    );

    expect(info.loadError).toContain("can only use '*' as the final segment");
  });

  test('does not match lookalike route prefixes', async () => {
    await pluginManager.load('plugin-b');

    const response = await fetch(
      `${testsBaseUrl}/plugins-extra/plugin-b/echo`,
      {
        method: 'POST'
      }
    );

    expect(response.status).toBe(404);
  });
});
