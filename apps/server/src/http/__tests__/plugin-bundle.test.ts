import { beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import fs from 'fs/promises';
import path from 'path';
import { loadMockedPlugins, resetPluginMocks } from '../../__tests__/mocks';
import { tdb, testsBaseUrl } from '../../__tests__/setup';
import { settings } from '../../db/schema';
import { PLUGINS_PATH } from '../../helpers/paths';

describe('/plugin-bundle', () => {
  beforeAll(async () => {
    await fs.mkdir(PLUGINS_PATH, { recursive: true });
    await loadMockedPlugins();
  });

  beforeEach(resetPluginMocks);

  test('should serve plugin bundle files', async () => {
    const response = await fetch(
      `${testsBaseUrl}/plugin-bundle/plugin-b/index.js`
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="index.js"'
    );

    const text = await response.text();

    expect(text).toContain('const onLoad');
  });

  test('should return 403 when plugins are disabled', async () => {
    await tdb.update(settings).set({ enablePlugins: false });

    const response = await fetch(
      `${testsBaseUrl}/plugin-bundle/plugin-b/index.js`
    );

    expect(response.status).toBe(403);

    const data = (await response.json()) as { error: string };

    expect(data).toHaveProperty('error', 'Plugins are disabled on this server');
  });

  test('should serve bundle files with query params', async () => {
    const response = await fetch(
      `${testsBaseUrl}/plugin-bundle/plugin-b/index.js?v=123&cache=false`
    );

    expect(response.status).toBe(200);

    const text = await response.text();

    expect(text).toContain('const onLoad');
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

    const data = (await response.json()) as { error: string };

    expect(data).toHaveProperty('error', 'File not found on disk');
  });

  test('should prevent path traversal attacks in file path', async () => {
    const response = await fetch(
      `${testsBaseUrl}/plugin-bundle/plugin-b/..%2F..%2F..%2Fetc/passwd`
    );

    expect(response.status).toBe(403);

    const data = (await response.json()) as { error: string };

    expect(data).toHaveProperty('error', 'Forbidden');
  });

  test('should prevent path traversal attacks in plugin id', async () => {
    const response = await fetch(
      `${testsBaseUrl}/plugin-bundle/${encodeURIComponent('../outside')}/index.js`
    );

    expect(response.status).toBe(403);

    const data = (await response.json()) as { error: string };

    expect(data).toHaveProperty('error', 'Forbidden');
  });

  test('should return 404 when file does not exist', async () => {
    const response = await fetch(
      `${testsBaseUrl}/plugin-bundle/plugin-b/missing-file.js`
    );

    expect(response.status).toBe(404);

    const data = (await response.json()) as { error: string };

    expect(data).toHaveProperty('error', 'File not found on disk');
  });

  test('should not match lookalike route prefixes', async () => {
    const response = await fetch(
      `${testsBaseUrl}/plugin-bundlex/plugin-b/index.js`
    );

    expect(response.status).toBe(404);
  });
});
