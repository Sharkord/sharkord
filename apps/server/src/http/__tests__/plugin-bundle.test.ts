import { CLIENT_ENTRY_FILE } from '@sharkord/shared';
import { beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import fs from 'fs/promises';
import path from 'path';
import { loadMockedPlugins, resetPluginMocks } from '../../__tests__/mocks';
import { tdb, testsBaseUrl } from '../../__tests__/setup';
import { settings } from '../../db/schema';
import { PLUGINS_PATH } from '../../helpers/paths';
import { pluginManager } from '../../plugins';

describe('/plugin-bundle', () => {
  beforeAll(async () => {
    await fs.mkdir(PLUGINS_PATH, { recursive: true });
    await loadMockedPlugins();
  });

  beforeEach(resetPluginMocks);

  test('should serve the client entry file', async () => {
    const response = await fetch(
      `${testsBaseUrl}/plugin-bundle/plugin-b/${CLIENT_ENTRY_FILE}`
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="index.js"'
    );

    // the client loads this with a native import(), and a module script served as anything
    // but a javascript type is refused by the browser before it ever runs
    expect(response.headers.get('Content-Type')).toContain('javascript');

    const text = await response.text();

    expect(text).toContain('export {}');
  });

  test('should not serve the server entry file', async () => {
    const response = await fetch(
      `${testsBaseUrl}/plugin-bundle/plugin-b/server/index.js`
    );

    expect(response.status).toBe(404);
  });

  test('should not serve any other file in the plugin directory', async () => {
    await fs.writeFile(
      path.join(PLUGINS_PATH, 'plugin-b', 'secrets.env'),
      'API_KEY=hunter2'
    );

    const response = await fetch(
      `${testsBaseUrl}/plugin-bundle/plugin-b/secrets.env`
    );

    expect(response.status).toBe(404);
  });

  test('should not serve the manifest', async () => {
    const response = await fetch(
      `${testsBaseUrl}/plugin-bundle/plugin-b/manifest.json`
    );

    expect(response.status).toBe(404);
  });

  test('should not serve a disabled plugin', async () => {
    await pluginManager.togglePlugin('plugin-b', false);

    const response = await fetch(
      `${testsBaseUrl}/plugin-bundle/plugin-b/${CLIENT_ENTRY_FILE}`
    );

    expect(response.status).toBe(404);
  });

  test('should return 403 when plugins are disabled', async () => {
    await tdb.update(settings).set({ enablePlugins: false });

    const response = await fetch(
      `${testsBaseUrl}/plugin-bundle/plugin-b/${CLIENT_ENTRY_FILE}`
    );

    expect(response.status).toBe(403);

    const data = (await response.json()) as { error: string };

    expect(data).toHaveProperty('error', 'Plugins are disabled on this server');
  });

  test('should serve bundle files with query params', async () => {
    const response = await fetch(
      `${testsBaseUrl}/plugin-bundle/plugin-b/${CLIENT_ENTRY_FILE}?v=123&cache=false`
    );

    expect(response.status).toBe(200);

    const text = await response.text();

    expect(text).toContain('export {}');
  });

  test('should return 400 when plugin id or file path is missing', async () => {
    const response = await fetch(`${testsBaseUrl}/plugin-bundle/`);

    expect(response.status).toBe(400);

    const data = (await response.json()) as { error: string };

    expect(data).toHaveProperty(
      'error',
      'Plugin ID and file path are required in the URL'
    );
  });

  test('should return 404 when requested path is a directory', async () => {
    const nestedDir = path.join(PLUGINS_PATH, 'plugin-b', 'nested', 'deep');

    await fs.mkdir(nestedDir, { recursive: true });

    const response = await fetch(
      `${testsBaseUrl}/plugin-bundle/plugin-b/nested/`
    );

    expect(response.status).toBe(404);
  });

  test('should prevent path traversal attacks in file path', async () => {
    const response = await fetch(
      `${testsBaseUrl}/plugin-bundle/plugin-b/..%2F..%2F..%2Fetc/passwd`
    );

    expect(response.status).toBe(404);
  });

  test('should prevent path traversal attacks in plugin id', async () => {
    const response = await fetch(
      `${testsBaseUrl}/plugin-bundle/${encodeURIComponent('../outside')}/${CLIENT_ENTRY_FILE}`
    );

    // an unknown plugin id is not enabled, so it never reaches the path check
    expect(response.status).toBe(404);
  });

  test('should return 404 when file does not exist', async () => {
    const response = await fetch(
      `${testsBaseUrl}/plugin-bundle/plugin-b/missing-file.js`
    );

    expect(response.status).toBe(404);
  });

  test('should not match lookalike route prefixes', async () => {
    const response = await fetch(
      `${testsBaseUrl}/plugin-bundlex/plugin-b/index.js`
    );

    expect(response.status).toBe(404);
  });

  test('should include ETag, Last-Modified, and no-cache policy on success', async () => {
    const response = await fetch(
      `${testsBaseUrl}/plugin-bundle/plugin-b/${CLIENT_ENTRY_FILE}`
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('ETag')).toBeDefined();
    expect(response.headers.get('Last-Modified')).toBeDefined();
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
  });

  test('should return 304 when If-None-Match matches ETag', async () => {
    const firstResponse = await fetch(
      `${testsBaseUrl}/plugin-bundle/plugin-b/${CLIENT_ENTRY_FILE}`
    );
    const etag = firstResponse.headers.get('ETag');

    expect(firstResponse.status).toBe(200);
    expect(etag).toBeDefined();

    const secondResponse = await fetch(
      `${testsBaseUrl}/plugin-bundle/plugin-b/${CLIENT_ENTRY_FILE}`,
      { headers: { 'If-None-Match': etag! } }
    );

    expect(secondResponse.status).toBe(304);
    expect(secondResponse.headers.get('ETag')).toBe(etag);
    expect(secondResponse.headers.get('Cache-Control')).toBe('no-cache');

    const body = await secondResponse.text();

    expect(body).toBe('');
  });

  test('should return 304 when If-Modified-Since matches Last-Modified', async () => {
    const firstResponse = await fetch(
      `${testsBaseUrl}/plugin-bundle/plugin-b/${CLIENT_ENTRY_FILE}`
    );
    const lastModified = firstResponse.headers.get('Last-Modified');

    expect(firstResponse.status).toBe(200);
    expect(lastModified).toBeDefined();

    const secondResponse = await fetch(
      `${testsBaseUrl}/plugin-bundle/plugin-b/${CLIENT_ENTRY_FILE}`,
      { headers: { 'If-Modified-Since': lastModified! } }
    );

    expect(secondResponse.status).toBe(304);
    expect(secondResponse.headers.get('Last-Modified')).toBe(lastModified);
  });

  test('should return no-store on error responses', async () => {
    const response = await fetch(
      `${testsBaseUrl}/plugin-bundle/plugin-b/missing-file.js`
    );

    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  test('should return no-store when plugins are disabled', async () => {
    await tdb.update(settings).set({ enablePlugins: false });

    const response = await fetch(
      `${testsBaseUrl}/plugin-bundle/plugin-b/${CLIENT_ENTRY_FILE}`
    );

    expect(response.status).toBe(403);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
