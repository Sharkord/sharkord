import { beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import fs from 'fs/promises';
import { loadMockedPlugins, resetPluginMocks } from '../../__tests__/mocks';
import { tdb, testsBaseUrl } from '../../__tests__/setup';
import { settings } from '../../db/schema';
import { PLUGINS_PATH } from '../../helpers/paths';
import { pluginManager } from '../../plugins';

describe('/plugin-components', () => {
  beforeAll(async () => {
    await fs.mkdir(PLUGINS_PATH, { recursive: true });
    await loadMockedPlugins();
  });

  beforeEach(resetPluginMocks);

  test('should return registered plugin components when plugins are enabled', async () => {
    await pluginManager.load('plugin-b');

    const response = await fetch(`${testsBaseUrl}/plugin-components`);

    expect(response.status).toBe(200);

    const data = (await response.json()) as Record<string, string[]>;

    expect(data).toHaveProperty('plugin-b');
    expect(data['plugin-b']).toContain('connect_screen');
    expect(data['plugin-b']).toContain('home_screen');
  });

  test('should return 403 when plugins are disabled', async () => {
    await tdb.update(settings).set({ enablePlugins: false });

    const response = await fetch(`${testsBaseUrl}/plugin-components`);

    expect(response.status).toBe(403);

    const data = (await response.json()) as { error: string };

    expect(data).toHaveProperty('error', 'Plugins are disabled on this server');
  });

  test('should not match lookalike route prefixes', async () => {
    await pluginManager.load('plugin-b');

    const response = await fetch(`${testsBaseUrl}/plugin-components-extra`);

    expect(response.status).toBe(404);
  });
});
