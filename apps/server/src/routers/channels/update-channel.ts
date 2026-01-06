import { ActivityLogType, Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishChannel } from '../../db/publishers';
import { channels } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const updateChannelRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number().min(1),
      name: z.string().min(2).max(24),
      topic: z.string().max(128).nullable(),
      private: z.boolean()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_CHANNELS);

    const updatedChannel = await db
      .update(channels)
      .set({
        name: input.name,
        topic: input.topic,
        private: input.private
      })
      .where(eq(channels.id, input.channelId))
      .returning()
      .get();

    publishChannel(updatedChannel.id, 'update');
    enqueueActivityLog({
      type: ActivityLogType.UPDATED_CHANNEL,
      userId: ctx.user.id,
      details: {
        channelId: updatedChannel.id,
        values: input
      }
    });
  });

export { updateChannelRoute };
