import { Permission } from '@sharkord/shared';
import { beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import { getMockedToken } from '../../__tests__/helpers';
import { loadMockedPlugins, resetPluginMocks } from '../../__tests__/mocks';
import { tdb, testsBaseUrl } from '../../__tests__/setup';
import { config } from '../../config';
import { rolePermissions, users } from '../../db/schema';
import { PLUGINS_PATH } from '../../helpers/paths';
import { pluginManager } from '../../plugins';

describe('/plugins/:pluginId/*', () => {
  beforeAll(async () => {
    await fs.mkdir(PLUGINS_PATH, { recursive: true });
    await loadMockedPlugins();
  });

  beforeEach(resetPluginMocks);

  // every plugin route shares one limiter, so a public one is enough to prove it
  describe('rate limiting', () => {
    beforeEach(() => pluginManager.load('plugin-b'));

    test('should stop hammering a plugin route from one address', async () => {
      const { maxRequests } = config.rateLimiters.pluginRoute;

      for (let attempt = 0; attempt < maxRequests; attempt++) {
        await fetch(`${testsBaseUrl}/plugins/plugin-b/hello`);
      }

      const response = await fetch(`${testsBaseUrl}/plugins/plugin-b/hello`);

      expect(response.status).toBe(429);
      expect(await response.json()).toMatchObject({
        error: expect.stringContaining('Too many requests')
      });
    });

    test('should count an authenticated route against the same limit', async () => {
      const { maxRequests } = config.rateLimiters.pluginRoute;

      for (let attempt = 0; attempt < maxRequests; attempt++) {
        await fetch(`${testsBaseUrl}/plugins/plugin-b/hello`);
      }

      const response = await fetch(`${testsBaseUrl}/plugins/plugin-b/me`, {
        headers: { authorization: `Bearer ${await getMockedToken(2)}` }
      });

      // the limiter runs before the caller is resolved, so this is 429 not 401
      expect(response.status).toBe(429);
    });
  });

  // plugin-b declares GET /me as auth only and GET /admin-only as needing
  // MANAGE_MESSAGES. the seeded moderator role (4, user 5) holds MANAGE_USERS
  // and MANAGE_ROLES but not MANAGE_MESSAGES
  describe('route authentication', () => {
    beforeEach(() => pluginManager.load('plugin-b'));

    const call = async (path: string, token?: string) =>
      fetch(`${testsBaseUrl}/plugins/plugin-b${path}`, {
        headers: token ? { authorization: `Bearer ${token}` } : undefined
      });

    test('leaves a route that declares nothing public', async () => {
      const response = await call('/hello');

      expect(response.status).toBe(200);
    });

    test('rejects an authenticated route with no token', async () => {
      const response = await call('/me');

      expect(response.status).toBe(401);
    });

    test('rejects a token that is not a token', async () => {
      const response = await call('/me', 'not-a-jwt');

      expect(response.status).toBe(401);
    });

    test('accepts a valid token and hands the handler the caller', async () => {
      const response = await call('/me', await getMockedToken(2));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ userId: 2 });
    });

    test('accepts the x-token header as well as Authorization', async () => {
      const response = await fetch(`${testsBaseUrl}/plugins/plugin-b/me`, {
        headers: { 'x-token': await getMockedToken(2) }
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ userId: 2 });
    });

    // a password change bumps tokenVersion, which has to end the old session
    test('rejects a token whose version is stale', async () => {
      const response = await call('/me', await getMockedToken(2, 99));

      expect(response.status).toBe(401);
    });

    test('rejects a banned user', async () => {
      await tdb.update(users).set({ banned: true }).where(eq(users.id, 2));

      const response = await call('/me', await getMockedToken(2));

      expect(response.status).toBe(401);
    });

    test('rejects a permission route without the permission', async () => {
      const response = await call('/admin-only', await getMockedToken(5));

      expect(response.status).toBe(403);
    });

    test('accepts a permission route once the role has it', async () => {
      await tdb.insert(rolePermissions).values({
        roleId: 4,
        permission: Permission.MANAGE_MESSAGES,
        createdAt: Date.now()
      });

      const response = await call('/admin-only', await getMockedToken(5));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ userId: 5 });
    });

    test('lets the owner through a permission route', async () => {
      const response = await call('/admin-only', await getMockedToken(1));

      expect(response.status).toBe(200);
    });

    test('still rejects a permission route with no token at all', async () => {
      const response = await call('/admin-only');

      expect(response.status).toBe(401);
    });
  });

  describe('plugin-b', () => {
    beforeEach(() => pluginManager.load('plugin-b'));

    test('serves plugin GET routes', async () => {
      const response = await fetch(`${testsBaseUrl}/plugins/plugin-b/hello`);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        pluginId: 'plugin-b',
        method: 'GET'
      });
    });

    test('serves plugin POST routes', async () => {
      const response = await fetch(`${testsBaseUrl}/plugins/plugin-b/echo`, {
        method: 'POST',
        body: 'hello from plugin route'
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        body: 'hello from plugin route'
      });
    });

    test('serves plugin PATCH routes', async () => {
      const response = await fetch(
        `${testsBaseUrl}/plugins/plugin-b/resource`,
        {
          method: 'PATCH'
        }
      );

      expect(response.status).toBe(202);
      expect(response.headers.get('content-type')).toBe('text/plain');
      expect(await response.text()).toBe('patched');
    });

    test('serves plugin DELETE routes', async () => {
      const response = await fetch(
        `${testsBaseUrl}/plugins/plugin-b/resource`,
        {
          method: 'DELETE'
        }
      );

      expect(response.status).toBe(204);
    });

    test('serves plugin OPTIONS routes', async () => {
      const response = await fetch(`${testsBaseUrl}/plugins/plugin-b/cors`, {
        method: 'OPTIONS'
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('allow')).toBe('POST, OPTIONS');
      expect(await response.text()).toBe('plugin options');
    });

    test('preserves generic OPTIONS fallback when plugin route is not registered', async () => {
      const response = await fetch(`${testsBaseUrl}/plugins/plugin-b/hello`, {
        method: 'OPTIONS'
      });

      expect(response.status).toBe(204);
    });

    test('supports raw text bodies, headers, custom responses, and wildcard paths', async () => {
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
      await pluginManager.unload('plugin-b');

      const response = await fetch(`${testsBaseUrl}/plugins/plugin-b/hello`);

      expect(response.status).toBe(404);
    });

    test('returns 404 after plugin is disabled', async () => {
      await pluginManager.togglePlugin('plugin-b', false);

      const response = await fetch(`${testsBaseUrl}/plugins/plugin-b/hello`);

      expect(response.status).toBe(404);
    });

    test('returns 404 for an unknown plugin id', async () => {
      const response = await fetch(
        `${testsBaseUrl}/plugins/does-not-exist/hello`
      );

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Not found' });
    });

    test('does not match lookalike route prefixes', async () => {
      const response = await fetch(
        `${testsBaseUrl}/plugins-extra/plugin-b/echo`,
        { method: 'POST' }
      );

      expect(response.status).toBe(404);
    });
  });

  describe('route matching', () => {
    beforeEach(() => pluginManager.load('plugin-http-routes'));

    test('serves plugin root routes', async () => {
      const response = await fetch(
        `${testsBaseUrl}/plugins/plugin-http-routes`
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('root');
    });

    test('uses the latest handler for duplicate registrations', async () => {
      const response = await fetch(
        `${testsBaseUrl}/plugins/plugin-http-routes/duplicate`
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('second');
    });

    test('prefers exact routes over wildcard routes', async () => {
      const response = await fetch(
        `${testsBaseUrl}/plugins/plugin-http-routes/wild/exact`
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('exact');
    });

    test('uses the longest matching wildcard route', async () => {
      const response = await fetch(
        `${testsBaseUrl}/plugins/plugin-http-routes/api/v1/users`
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('api-v1');
    });

    test('matches wildcard routes at the wildcard parent path', async () => {
      const response = await fetch(
        `${testsBaseUrl}/plugins/plugin-http-routes/wild`
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('wildcard');
    });

    test('matches a root wildcard route on any path', async () => {
      const response = await fetch(
        `${testsBaseUrl}/plugins/plugin-http-routes/anything/at/all`,
        { method: 'DELETE' }
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('catch-all');
    });

    test('returns 404 when the method does not match a registered route', async () => {
      const response = await fetch(
        `${testsBaseUrl}/plugins/plugin-http-routes/post-only`
      );

      expect(response.status).toBe(404);
    });

    test('matches routes requested with a trailing slash', async () => {
      const response = await fetch(
        `${testsBaseUrl}/plugins/plugin-http-routes/trailing/`
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('trailing');
    });

    test('matches percent-encoded route paths', async () => {
      const response = await fetch(
        `${testsBaseUrl}/plugins/plugin-http-routes/encoded%20path`
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('encoded');
    });

    test('returns 500 when a plugin route handler throws', async () => {
      const response = await fetch(
        `${testsBaseUrl}/plugins/plugin-http-routes/throws`
      );

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Internal server error' });
    });

    test('drops the connection when a handler throws after writing headers', async () => {
      await expect(
        fetch(
          `${testsBaseUrl}/plugins/plugin-http-routes/throws-after-headers`,
          { headers: { Connection: 'close' } }
        ).then((response) => response.text())
      ).rejects.toThrow();
    });

    test('keeps serving requests after a handler throws mid-response', async () => {
      await fetch(
        `${testsBaseUrl}/plugins/plugin-http-routes/throws-after-headers`,
        { headers: { Connection: 'close' } }
      )
        .then((response) => response.text())
        .catch(() => undefined);

      const response = await fetch(
        `${testsBaseUrl}/plugins/plugin-http-routes`
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('root');
    });
  });

  test('does not serve routes registered before a failed load', async () => {
    await pluginManager.load('plugin-http-fails-load');

    const info = await pluginManager.getPluginInfo('plugin-http-fails-load');

    expect(info.loadError).toContain('Intentional HTTP route load failure');

    const response = await fetch(
      `${testsBaseUrl}/plugins/plugin-http-fails-load/leaked`
    );

    expect(response.status).toBe(404);
  });
});
