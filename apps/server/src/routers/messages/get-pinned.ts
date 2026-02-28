import { ChannelPermission } from '@sharkord/shared';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { joinMessagesWithRelations } from '../../db/queries/messages';
import { channels, messages } from '../../db/schema';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const getPinnedRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number()
    })
  )
  .query(async ({ ctx, input }) => {
    await ctx.needsChannelPermission(
      input.channelId,
      ChannelPermission.VIEW_CHANNEL
    );

    const channel = await db
      .select({
        private: channels.private,
        fileAccessToken: channels.fileAccessToken
      })
      .from(channels)
      .where(eq(channels.id, input.channelId))
      .get();

    invariant(channel, {
      code: 'NOT_FOUND',
      message: 'Channel not found'
    });

    const rows = await db
      .select()
      .from(messages)
      .where(
        and(eq(messages.channelId, input.channelId), eq(messages.pinned, true))
      )
      .orderBy(desc(messages.createdAt));

    return joinMessagesWithRelations(rows, channel);
  });

export { getPinnedRoute };
