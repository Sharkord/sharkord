import { ActivityLogType, Permission } from '@sharkord/shared';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { reorderPositions } from '../../db/mutations/positions';
import { publishChannel } from '../../db/publishers';
import { channels } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const MAX_REORDERED_CHANNELS = 500;

const reorderChannelsRoute = protectedProcedure
  .input(
    z.object({
      categoryId: z.number(),
      channelIds: z.array(z.number()).max(MAX_REORDERED_CHANNELS)
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CHANNELS);

    const existingCategoryChannels = await db
      .select({ id: channels.id })
      .from(channels)
      .where(eq(channels.categoryId, input.categoryId))
      .orderBy(asc(channels.position), asc(channels.id));

    const nextChannelOrder = await reorderPositions(
      channels,
      existingCategoryChannels.map((channel) => channel.id),
      input.channelIds
    );

    nextChannelOrder.forEach((channelId) => {
      publishChannel(channelId, 'update');
    });

    if (nextChannelOrder.length > 0) {
      enqueueActivityLog({
        type: ActivityLogType.REORDERED_CHANNELS,
        userId: ctx.user.id,
        details: {
          categoryId: input.categoryId,
          channelIds: nextChannelOrder
        }
      });
    }
  });

export { reorderChannelsRoute };
