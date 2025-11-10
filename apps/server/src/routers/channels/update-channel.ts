import { ActivityLogType } from '@sharkord/shared';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { updateChannel } from '../../db/mutations/channels/update-channel';
import { publishChannel } from '../../db/publishers';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const updateChannelRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number().min(1),
      name: z.string().min(2).max(24),
      topic: z.string().max(128).nullable()
    })
  )
  .mutation(async ({ ctx, input }) => {
    const updatedChannel = await updateChannel(input.channelId, {
      name: input.name,
      topic: input.topic
    });

    if (!updatedChannel) {
      throw new TRPCError({
        code: 'NOT_FOUND'
      });
    }

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
