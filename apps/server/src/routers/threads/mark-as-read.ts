import { ServerEvents } from '@sharkord/shared';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import {
  getFollowedThread,
  getLatestThreadReply
} from '../../db/queries/threads';
import { threadFollowers } from '../../db/schema';
import { loadThreadParent } from '../../helpers/threads';
import { protectedProcedure } from '../../utils/trpc';

const markThreadAsReadRoute = protectedProcedure
  .input(
    z.object({
      parentMessageId: z.number()
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { parentMessageId } = input;

    const parentMessage = await loadThreadParent(ctx, parentMessageId);
    const latestReply = await getLatestThreadReply(parentMessageId);

    if (!latestReply) return;

    const updated = await db
      .update(threadFollowers)
      .set({ lastReadMessageId: latestReply.id, hasUnreadMention: false })
      .where(
        and(
          eq(threadFollowers.userId, ctx.userId),
          eq(threadFollowers.parentMessageId, parentMessageId)
        )
      )
      .returning({ userId: threadFollowers.userId })
      .get();

    if (!updated) return;

    const thread = await getFollowedThread(ctx.userId, parentMessageId);

    ctx.pubsub.publishFor(ctx.userId, ServerEvents.THREAD_FOLLOW_UPDATE, {
      parentMessageId,
      channelId: parentMessage.channelId,
      unreadCount: 0,
      hasUnreadMention: false,
      thread
    });
  });

export { markThreadAsReadRoute };
