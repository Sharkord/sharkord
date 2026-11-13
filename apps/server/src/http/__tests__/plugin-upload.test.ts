import { ActivityLogType, PLUGIN_SDK_VERSION } from '@sharkord/shared';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { login } from '../../__tests__/helpers';
import { tdb, testsBaseUrl } from '../../__tests__/setup';
import { activityLog } from '../../db/schema';
import { PLUGINS_PATH } from '../../helpers/paths';
import { getRateLimit } from '../../helpers/rate-limits';
import { drainActivityLogQueue } from '../../queues/activity-log';

const PLUGIN_ID = 'plugin-uploaded';

const manifest = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    id: PLUGIN_ID,
    name: 'Uploaded plugin',
    author: 'test',
    description: 'uploaded test plugin',
    sdkVersion: PLUGIN_SDK_VERSION,
    version: '1.0.0',
    ...overrides
  });

const pluginArchive = async (
  manifestJson = manifest(),
  extra: Record<string, string> = {}
) =>
  new Bun.Archive(
    {
      [`${PLUGIN_ID}/manifest.json`]: manifestJson,
      [`${PLUGIN_ID}/server/index.js`]: 'export const onLoad = () => {};',
      [`${PLUGIN_ID}/client/index.js`]: 'export const components = {};',
      ...extra
    },
    { compress: 'gzip' }
  ).bytes();

const uploadPlugin = (body: string | Uint8Array, token: string) =>
  fetch(`${testsBaseUrl}/plugin-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'x-token': token
    },
    body
  });

const getToken = async (identity: string) => {
  const response = await login(identity, 'password123');
  const { token } = (await response.json()) as { token: string };

  return token;
};

const readInstalledManifest = async () =>
  JSON.parse(
    await fs.readFile(
      path.join(PLUGINS_PATH, PLUGIN_ID, 'manifest.json'),
      'utf-8'
    )
  );

const isInstalled = () =>
  fs.exists(path.join(PLUGINS_PATH, PLUGIN_ID, 'manifest.json'));

describe('/plugin-upload', () => {
  let ownerToken: string;

  beforeEach(async () => {
    ownerToken = await getToken('testowner');
  });

  afterEach(async () => {
    await fs.rm(path.join(PLUGINS_PATH, PLUGIN_ID), {
      recursive: true,
      force: true
    });
  });

  test('should install a gzipped plugin archive', async () => {
    const response = await uploadPlugin(await pluginArchive(), ownerToken);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: PLUGIN_ID,
      name: 'Uploaded plugin',
      version: '1.0.0'
    });

    expect(await readInstalledManifest()).toMatchObject({ version: '1.0.0' });

    await drainActivityLogQueue();

    const entry = await tdb
      .select()
      .from(activityLog)
      .where(eq(activityLog.type, ActivityLogType.PLUGIN_INSTALLED))
      .get();

    expect(entry?.userId).toBe(1);
    expect(entry?.details).toEqual({ pluginId: PLUGIN_ID, version: '1.0.0' });
  });

  test('should replace an installed plugin and log it as an update', async () => {
    await uploadPlugin(await pluginArchive(), ownerToken);

    const response = await uploadPlugin(
      await pluginArchive(manifest({ version: '2.0.0' })),
      ownerToken
    );

    expect(response.status).toBe(200);
    expect(await readInstalledManifest()).toMatchObject({ version: '2.0.0' });

    await drainActivityLogQueue();

    const entry = await tdb
      .select()
      .from(activityLog)
      .where(eq(activityLog.type, ActivityLogType.PLUGIN_UPDATED))
      .get();

    expect(entry?.details).toEqual({ pluginId: PLUGIN_ID, version: '2.0.0' });
  });

  test('should reject a request without a valid token', async () => {
    const response = await uploadPlugin(await pluginArchive(), 'invalid');

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expect(await isInstalled()).toBe(false);
  });

  test('should reject a user without the manage plugins permission', async () => {
    const response = await uploadPlugin(
      await pluginArchive(),
      await getToken('testuser')
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'You do not have permission to manage plugins'
    });
    expect(await isInstalled()).toBe(false);
  });

  test('should reject an empty body', async () => {
    const response = await uploadPlugin(new Uint8Array(), ownerToken);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'No plugin archive was uploaded'
    });
  });

  test('should reject an archive larger than the plugin size limit', async () => {
    const response = await uploadPlugin(
      new Uint8Array(20 * 1024 * 1024 + 1),
      ownerToken
    );

    expect(response.status).toBe(413);
  });

  test('should reject a file that is not a plugin archive', async () => {
    const response = await uploadPlugin('definitely not a tar', ownerToken);

    expect(response.status).toBe(400);
    expect(await isInstalled()).toBe(false);
  });

  test('should reject an archive without the plugin entry files', async () => {
    const archive = await new Bun.Archive({
      [`${PLUGIN_ID}/manifest.json`]: manifest()
    }).bytes();

    const response = await uploadPlugin(archive, ownerToken);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Plugin archive does not contain a valid plugin structure'
    });
  });

  test('should reject an archive with an entry outside the extraction directory', async () => {
    const response = await uploadPlugin(
      await pluginArchive(manifest(), { '../escaped.txt': 'nope' }),
      ownerToken
    );

    expect(response.status).toBe(400);

    const { error } = (await response.json()) as { error: string };

    expect(error).toContain('outside the extraction directory');
    expect(await isInstalled()).toBe(false);
  });

  // the manifest id becomes a directory name, so it must be validated before use
  test('should reject a manifest with an invalid plugin id', async () => {
    const response = await uploadPlugin(
      await pluginArchive(manifest({ id: '../evil' })),
      ownerToken
    );

    expect(response.status).toBe(400);

    const { error } = (await response.json()) as { error: string };

    expect(error).toStartWith('Invalid plugin manifest:');
    expect(error).toContain(
      'Plugin ID must contain only lowercase letters, numbers, and dashes'
    );
  });

  test('should reject a plugin built for a different sdk version', async () => {
    const response = await uploadPlugin(
      await pluginArchive(manifest({ sdkVersion: PLUGIN_SDK_VERSION + 1 })),
      ownerToken
    );

    expect(response.status).toBe(400);

    const { error } = (await response.json()) as { error: string };

    expect(error).toContain('is not compatible with server SDK version');
    expect(await isInstalled()).toBe(false);
  });

  test('should rate limit excessive uploads', async () => {
    const { maxRequests } = getRateLimit();
    const statuses: number[] = [];

    for (let i = 0; i < maxRequests + 1; i++) {
      const response = await uploadPlugin('probe', 'invalid');

      statuses.push(response.status);
    }

    expect(statuses.slice(0, maxRequests).every((s) => s === 401)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });
});
