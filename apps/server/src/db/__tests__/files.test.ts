import { describe, expect, test } from 'bun:test';
import { tdb } from '../../__tests__/setup';
import { getOrphanedFileIds, getStorageUsageByPlugin } from '../queries/files';
import { files, pluginData } from '../schema';

const ORPHAN_GRACE_MS = 15 * 60 * 1000;

const insertOrphans = async (count: number) => {
  const createdAt = Date.now() - ORPHAN_GRACE_MS - 60_000;

  await tdb.insert(files).values(
    Array.from({ length: count }, (_, index) => ({
      name: `orphan-${index}.bin`,
      originalName: `orphan-${index}.bin`,
      md5: `md5-${index}`,
      userId: 1,
      size: 1,
      mimeType: 'application/octet-stream',
      extension: '.bin',
      createdAt
    }))
  );
};

describe('getOrphanedFileIds', () => {
  test('should cap what one sweep returns rather than every orphan on the server', async () => {
    await insertOrphans(620);

    const ids = await getOrphanedFileIds();

    expect(ids.length).toBe(500);
  });

  test('should return every orphan when there are fewer than the batch size', async () => {
    await insertOrphans(3);

    expect((await getOrphanedFileIds()).length).toBe(3);
  });

  test('should ignore files inside the grace window', async () => {
    await tdb.insert(files).values({
      name: 'fresh.bin',
      originalName: 'fresh.bin',
      md5: 'md5-fresh',
      userId: 1,
      size: 1,
      mimeType: 'application/octet-stream',
      extension: '.bin',
      createdAt: Date.now()
    });

    expect(await getOrphanedFileIds()).toEqual([]);
  });
});

describe('getStorageUsageByPlugin', () => {
  const insertPluginFile = async (pluginId: string, size: number) =>
    tdb.insert(files).values({
      name: `${pluginId}-${size}.bin`,
      originalName: `${pluginId}-${size}.bin`,
      md5: `md5-${pluginId}-${size}`,
      userId: null,
      pluginId,
      size,
      mimeType: 'application/octet-stream',
      extension: '.bin',
      createdAt: Date.now()
    });

  test('should total the files of each plugin', async () => {
    await tdb
      .insert(pluginData)
      .values({ pluginId: 'plugin-a', enabled: true });
    await insertPluginFile('plugin-a', 100);
    await insertPluginFile('plugin-a', 50);

    const [usage] = await getStorageUsageByPlugin();

    expect(usage).toEqual({
      pluginId: 'plugin-a',
      fileCount: 2,
      usedSpace: 150,
      installed: true
    });
  });

  // the point of the screen: bytes left behind by a plugin that is gone
  test('should mark a plugin that is no longer installed', async () => {
    await insertPluginFile('plugin-gone', 10);

    const [usage] = await getStorageUsageByPlugin();

    expect(usage!.installed).toBe(false);
  });

  test('should ignore files that belong to a user', async () => {
    await tdb.insert(files).values({
      name: 'user.bin',
      originalName: 'user.bin',
      md5: 'md5-user',
      userId: 1,
      size: 10,
      mimeType: 'application/octet-stream',
      extension: '.bin',
      createdAt: Date.now()
    });

    expect(await getStorageUsageByPlugin()).toEqual([]);
  });

  test('should order the biggest consumer first', async () => {
    await insertPluginFile('plugin-small', 10);
    await insertPluginFile('plugin-big', 900);

    const usage = await getStorageUsageByPlugin();

    expect(usage.map((row) => row.pluginId)).toEqual([
      'plugin-big',
      'plugin-small'
    ]);
  });
});
