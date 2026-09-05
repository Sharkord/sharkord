import { Permission } from '@sharkord/shared';
import { z } from 'zod';
import {
  updateChannel,
  zChannelName,
  zChannelTopic
} from '../../helpers/channels';
import { protectedProcedure } from '../../utils/trpc';

const updateChannelRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number().min(1),
      name: zChannelName.min(2).optional(),
      topic: zChannelTopic.optional(),
      private: z.boolean().optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_CHANNELS);

    const { channelId, ...values } = input;

    await updateChannel(channelId, values, ctx.user.id);
  });

export { updateChannelRoute };
