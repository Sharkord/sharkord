import { ChannelType, type TIMessage } from '@sharkord/shared';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { channels, messages } from '../../db/schema';

const createInfiniteScrollMockData = async (
  db: BunSQLiteDatabase,
  e2eChannelsCategoryId: number
) => {
  const scrollChannel = await db
    .insert(channels)
    .values({
      name: 'Infinite Scroll',
      type: ChannelType.TEXT,
      position: 1,
      categoryId: e2eChannelsCategoryId,
      createdAt: Date.now()
    })
    .returning()
    .get();

  const totalMockMessages = 1000;
  const messagesPerGroup = 5;
  const intraGroupSpacingMs = 10 * 1000;
  const groupSpacingMs = 2 * 60 * 1000;
  const totalGroups = Math.ceil(totalMockMessages / messagesPerGroup);
  const baseCreatedAt = Date.now() - totalGroups * groupSpacingMs;

  const mockMessages = Array.from({ length: totalMockMessages }).map(
    (_, index) => {
      const groupIndex = Math.floor(index / messagesPerGroup);
      const indexWithinGroup = index % messagesPerGroup;

      const mockMessage: TIMessage = {
        channelId: scrollChannel!.id,
        userId: 1,
        content: `Mock message ${index + 1}`,
        createdAt:
          baseCreatedAt +
          groupIndex * groupSpacingMs +
          indexWithinGroup * intraGroupSpacingMs
      };

      return mockMessage;
    }
  );

  await db.insert(messages).values(mockMessages);
};

export { createInfiniteScrollMockData };
