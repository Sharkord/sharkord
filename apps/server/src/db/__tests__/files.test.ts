import { describe, expect, test } from 'bun:test';
import { tdb } from '../../__tests__/setup';
import { getOrphanedFileIds } from '../queries/files';
import { files } from '../schema';

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
