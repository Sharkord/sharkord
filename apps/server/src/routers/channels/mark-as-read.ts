import { ServerEvents } from '@sharkord/shared';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db';
import { getChannelsReadStatesForUser } from '../../db/queries/channels';
import { channelReadStates, messages } from '../../db/schema';
import { assertChannelAccess } from '../../helpers/assert-channel-access';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const markAsReadRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.markAsRead.maxRequests,
  windowMs: config.rateLimiters.markAsRead.windowMs,
  logLabel: 'markAsRead'
})
  .input(
    z.object({
      channelId: z.number()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await assertChannelAccess(ctx, input.channelId);

    const { channelId } = input;

    const newestMessage = await db
      .select({ id: messages.id })
      .from(messages)
      .where(
        and(eq(messages.channelId, channelId), isNull(messages.parentMessageId))
      )
      .orderBy(desc(messages.createdAt))
      .limit(1)
      .get();

    if (!newestMessage) {
      return;
    }

    await db
      .insert(channelReadStates)
      .values({
        channelId,
        userId: ctx.userId,
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
      ctx.userId,
      channelId
    );

    // the caller's other sessions need to drop the unread badge too
    ctx.pubsub.publishFor(ctx.userId, ServerEvents.CHANNEL_READ_STATES_UPDATE, {
      channelId,
      count: updatedReadStates[channelId] ?? 0
    });
  });

export { markAsReadRoute };
