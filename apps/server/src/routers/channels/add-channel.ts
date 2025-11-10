import { ActivityLogType, ChannelType, Permission } from '@sharkord/shared';
import { z } from 'zod';
import { createChannel } from '../../db/mutations/channels/create-channel';
import { publishChannel } from '../../db/publishers';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const addChannelRoute = protectedProcedure
  .input(
    z.object({
      type: z.enum(ChannelType),
      name: z.string().min(1).max(16),
      categoryId: z.number()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CHANNELS);

    const channel = await createChannel({
      name: input.name,
      type: input.type,
      categoryId: input.categoryId
    });

    publishChannel(channel.id, 'create');
    enqueueActivityLog({
      type: ActivityLogType.CREATED_CHANNEL,
      userId: ctx.user.id,
      details: {
        channelId: channel.id,
        channelName: channel.name,
        type: channel.type as ChannelType
      }
    });
  });

export { addChannelRoute };
