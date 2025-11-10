import { ActivityLogType, Permission } from '@sharkord/shared';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { removeChannel } from '../../db/mutations/channels/remove-channel';
import { publishChannel } from '../../db/publishers';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const deleteChannelRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CHANNELS);

    const removedChannel = await removeChannel(input.channelId);

    if (!removedChannel) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    publishChannel(removedChannel.id, 'delete');
    enqueueActivityLog({
      type: ActivityLogType.DELETED_CHANNEL,
      userId: ctx.user.id,
      details: {
        channelId: removedChannel.id,
        channelName: removedChannel.name
      }
    });
  });

export { deleteChannelRoute };
