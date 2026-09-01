import { DEFAULT_MESSAGES_LIMIT, type TJoinedMessage } from '@sharkord/shared';
import { and, desc, eq, lt } from 'drizzle-orm';
import { db } from '../../db';
import { joinMessagesWithRelations } from '../../db/queries/messages';
import { messages } from '../../db/schema';

type TListPluginMessagesOptions = {
  channelId: number;
  limit?: number;
  before?: number;
  parentMessageId?: number;
};

const listPluginMessages = async ({
  channelId,
  limit = DEFAULT_MESSAGES_LIMIT,
  before,
  parentMessageId
}: TListPluginMessagesOptions): Promise<TJoinedMessage[]> => {
  const safeLimit = Math.min(
    Math.max(Math.trunc(limit) || 1, 1),
    DEFAULT_MESSAGES_LIMIT
  );

  const conditions = [eq(messages.channelId, channelId)];

  if (parentMessageId !== undefined) {
    conditions.push(eq(messages.parentMessageId, parentMessageId));
  }

  if (before !== undefined) {
    conditions.push(lt(messages.createdAt, before));
  }

  const rows = await db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(safeLimit);

  return joinMessagesWithRelations(rows);
};

export { listPluginMessages };
export type { TListPluginMessagesOptions };
