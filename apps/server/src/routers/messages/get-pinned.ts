import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { joinMessagesWithRelations } from '../../db/queries/messages';
import { channels, messages } from '../../db/schema';
import { assertChannelAccess } from '../../helpers/assert-channel-access';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const getPinnedRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number()
    })
  )
  .query(async ({ ctx, input }) => {
    await assertChannelAccess(ctx, input.channelId);

    const channel = await db
      .select({
        private: channels.private
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

    return joinMessagesWithRelations(rows);
  });

export { getPinnedRoute };
