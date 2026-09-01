import { Permission } from '@sharkord/shared';
import { z } from 'zod';
import { deleteChannel } from '../../helpers/channels';
import { protectedProcedure } from '../../utils/trpc';

const deleteChannelRoute = protectedProcedure
  .input(z.object({ channelId: z.number() }))
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CHANNELS);

    await deleteChannel(input.channelId, ctx.user.id);
  });

export { deleteChannelRoute };
