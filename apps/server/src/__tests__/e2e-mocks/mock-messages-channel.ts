import { ChannelType, type TIMessage } from '@sharkord/shared';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { channels, messages } from '../../db/schema';

type TMockChannelOptions = {
  name: string;
  position: number;
  totalMessages: number;
  firstNumber: number;
};

// a text channel filled with "Mock message N", oldest first, so a test can tell where in the
// history it is looking. seeded more than once: specs that send messages need a channel of
// their own, or the messages they add shift the pages the pagination specs are counting
const createMockMessagesChannel = async (
  db: BunSQLiteDatabase,
  e2eChannelsCategoryId: number,
  { name, position, totalMessages, firstNumber }: TMockChannelOptions
) => {
  const scrollChannel = await db
    .insert(channels)
    .values({
      name,
      type: ChannelType.TEXT,
      position,
      categoryId: e2eChannelsCategoryId,
      createdAt: Date.now()
    })
    .returning()
    .get();

  const messagesPerGroup = 5;
  const intraGroupSpacingMs = 10 * 1000;
  const groupSpacingMs = 2 * 60 * 1000;
  const totalGroups = Math.ceil(totalMessages / messagesPerGroup);
  const baseCreatedAt = Date.now() - totalGroups * groupSpacingMs;

  const mockMessages = Array.from({ length: totalMessages }).map((_, index) => {
    const groupIndex = Math.floor(index / messagesPerGroup);
    const indexWithinGroup = index % messagesPerGroup;

    const mockMessage: TIMessage = {
      channelId: scrollChannel!.id,
      userId: 1,
      content: `Mock message ${firstNumber + index}`,
      createdAt:
        baseCreatedAt +
        groupIndex * groupSpacingMs +
        indexWithinGroup * intraGroupSpacingMs,
      metadata: null
    };

    return mockMessage;
  });

  await db.insert(messages).values(mockMessages);
};

export { createMockMessagesChannel };
