import { describe, expect, test } from 'bun:test';
import { tdb } from '../../__tests__/setup';
import { settings } from '../schema';

describe('settings table', () => {
  test('should refuse a second settings row', async () => {
    const [existing] = await tdb.select().from(settings);

    expect(existing).toBeDefined();

    const { serverId, ...rest } = existing!;

    // a different serverId, so this is only refused by the single row index and
    // not by the pre-existing unique index on serverId
    // the drizzle builder is lazy, so it has to be executed inside the assertion
    await expect(
      (async () => {
        await tdb
          .insert(settings)
          .values({ ...rest, serverId: `${serverId}-second` })
          .run();
      })()
    ).rejects.toThrow();

    const rows = await tdb.select().from(settings);

    expect(rows.length).toBe(1);
  });
});
