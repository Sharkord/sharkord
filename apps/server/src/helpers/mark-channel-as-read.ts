import { ServerEvents } from '@sharkord/shared';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../db';
import { getChannelsReadStatesForUser } from '../db/queries/channels';
import { channelReadStates, messages } from '../db/schema';
import { pubsub } from '../utils/pubsub';

const markChannelAsRead = async (userId: number, channelId: number) => {
  const newestMessage = await db
    .select({ id: messages.id })
    .from(messages)
    .where(
      and(eq(messages.channelId, channelId), isNull(messages.parentMessageId))
    )
    .orderBy(desc(messages.id))
    .limit(1)
    .get();

  if (!newestMessage) {
    return;
  }

  await db
    .insert(channelReadStates)
    .values({
      channelId,
      userId,
      lastReadMessageId: newestMessage.id,
      lastReadAt: Date.now()
    })
    .onConflictDoUpdate({
      target: [channelReadStates.channelId, channelReadStates.userId],
      set: {
        lastReadMessageId: newestMessage.id,
        lastReadAt: Date.now()
      }
    });

  const updatedReadStates = await getChannelsReadStatesForUser(
    userId,
    channelId
  );

  pubsub.publishFor(userId, ServerEvents.CHANNEL_READ_STATES_UPDATE, {
    channelId,
    count: updatedReadStates[channelId] ?? 0
  });
};

export { markChannelAsRead };
