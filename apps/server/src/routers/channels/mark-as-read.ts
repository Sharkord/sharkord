import { ChannelPermission, type TMessage } from '@sharkord/shared';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { channelReadStates, messages } from '../../db/schema';
import { protectedProcedure } from '../../utils/trpc';

const markAsReadRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsChannelPermission(
      input.channelId,
      ChannelPermission.VIEW_CHANNEL
    );

    const { channelId } = input;

    // get the newest message in the channel
    const newestMessage: TMessage | undefined = await db
      .select()
      .from(messages)
      .where(eq(messages.channelId, channelId))
      .orderBy(desc(messages.createdAt))
      .limit(1)
      .get();

    if (!newestMessage) {
      return;
    }

    const newestId = newestMessage.id;

    const existingState = await db
      .select()
      .from(channelReadStates)
      .where(
        and(
          eq(channelReadStates.channelId, channelId),
          eq(channelReadStates.userId, ctx.userId)
        )
      )
      .get();

    if (existingState) {
      await db
        .update(channelReadStates)
        .set({
          lastReadMessageId: newestId,
          lastReadAt: Date.now()
        })
        .where(
          and(
            eq(channelReadStates.channelId, channelId),
            eq(channelReadStates.userId, ctx.userId)
          )
        );
    } else {
      await db.insert(channelReadStates).values({
        channelId,
        userId: ctx.userId,
        lastReadMessageId: newestId,
        lastReadAt: Date.now()
      });
    }
  });

export { markAsReadRoute };
