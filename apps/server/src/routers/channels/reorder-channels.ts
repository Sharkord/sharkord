import { Permission } from '@sharkord/shared';
import { z } from 'zod';
import {
  MAX_REORDERED_CHANNELS,
  reorderChannels
} from '../../helpers/channels';
import { protectedProcedure } from '../../utils/trpc';

const reorderChannelsRoute = protectedProcedure
  .input(
    z.object({
      categoryId: z.number(),
      channelIds: z.array(z.number()).max(MAX_REORDERED_CHANNELS)
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CHANNELS);

    await reorderChannels(input.categoryId, input.channelIds, ctx.user.id);
  });

export { reorderChannelsRoute };
