import { ServerEvents } from '@sharkord/shared';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db';
import {
  getFollowedThread,
  getLatestThreadReply
} from '../../db/queries/threads';
import { threadFollowers } from '../../db/schema';
import { loadThreadParent } from '../../helpers/threads';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const setThreadFollowRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.markAsRead.maxRequests,
  windowMs: config.rateLimiters.markAsRead.windowMs,
  logLabel: 'setThreadFollow'
})
  .input(
    z.object({
      parentMessageId: z.number(),
      follow: z.boolean()
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { parentMessageId, follow } = input;

    const parentMessage = await loadThreadParent(ctx, parentMessageId);

    if (follow) {
      const latestReply = await getLatestThreadReply(parentMessageId);

      const lastReadMessageId = latestReply?.id ?? null;
      const lastReplyAt = latestReply?.createdAt ?? parentMessage.createdAt;

      await db
        .insert(threadFollowers)
        .values({
          userId: ctx.userId,
          parentMessageId,
          lastReadMessageId,
          lastReplyAt,
          createdAt: Date.now()
        })
        .onConflictDoUpdate({
          target: [threadFollowers.userId, threadFollowers.parentMessageId],
          set: { lastReadMessageId, hasUnreadMention: false }
        });
    } else {
      await db
        .delete(threadFollowers)
        .where(
          and(
            eq(threadFollowers.userId, ctx.userId),
            eq(threadFollowers.parentMessageId, parentMessageId)
          )
        );
    }

    const thread = follow
      ? await getFollowedThread(ctx.userId, parentMessageId)
      : null;

    ctx.pubsub.publishFor(ctx.userId, ServerEvents.THREAD_FOLLOW_UPDATE, {
      parentMessageId,
      channelId: parentMessage.channelId,
      unreadCount: 0,
      hasUnreadMention: false,
      thread
    });
  });

export { setThreadFollowRoute };
