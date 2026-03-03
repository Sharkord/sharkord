import { ChannelPermission, ChannelType } from '@sharkord/shared';
import { and, desc, eq, inArray, isNull, like } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { channels, messages } from '../../db/schema';
import { protectedProcedure } from '../../utils/trpc';

const searchMessagesRoute = protectedProcedure
  .input(
    z.object({
      query: z.string().min(1).max(200),
      limit: z.number().default(25)
    })
  )
  .query(async ({ ctx, input }) => {
    const { query, limit } = input;

    // get all text channels
    const allTextChannels = await db
      .select({ id: channels.id })
      .from(channels)
      .where(eq(channels.type, ChannelType.TEXT));

    // filter to channels the user can view
    const accessibleIds: number[] = [];

    for (const channel of allTextChannels) {
      const canView = await ctx.hasChannelPermission(
        channel.id,
        ChannelPermission.VIEW_CHANNEL
      );

      if (canView) {
        accessibleIds.push(channel.id);
      }
    }

    if (accessibleIds.length === 0) {
      return [];
    }

    const results = await db
      .select({
        id: messages.id,
        content: messages.content,
        channelId: messages.channelId,
        userId: messages.userId,
        createdAt: messages.createdAt
      })
      .from(messages)
      .where(
        and(
          inArray(messages.channelId, accessibleIds),
          like(messages.content, `%${query}%`),
          isNull(messages.parentMessageId)
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    return results;
  });

export { searchMessagesRoute };
