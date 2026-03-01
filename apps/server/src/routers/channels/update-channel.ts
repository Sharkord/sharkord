import { ActivityLogType, Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishChannel } from '../../db/publishers';
import { isDirectMessageChannel } from '../../db/queries/dms';
import { channels } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const updateChannelRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number().min(1),
      name: z.string().min(2).max(27).optional(),
      topic: z.string().max(128).nullable().optional(),
      private: z.boolean().optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_CHANNELS);

    const isDmChannel = await isDirectMessageChannel(input.channelId);

    invariant(!isDmChannel, {
      code: 'FORBIDDEN',
      message: 'Cannot update DM channels'
    });

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
