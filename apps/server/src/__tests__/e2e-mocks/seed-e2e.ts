import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { categories } from '../../db/schema';
import { createInfiniteScrollMockData } from './infinite-scroll-mock';
import { messageRenderMock } from './message-render-mock';

const seedE2E = async (db: BunSQLiteDatabase) => {
  const e2eChannelsCategory = await db
    .insert(categories)
    .values({
      name: 'E2E Channels',
      position: 2,
      createdAt: Date.now()
    })
    .returning()
    .get();

  await createInfiniteScrollMockData(db, e2eChannelsCategory!.id);
  await messageRenderMock(db, e2eChannelsCategory!.id);
};

export { seedE2E };
