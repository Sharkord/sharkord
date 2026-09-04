import { ChannelType, Permission } from '@sharkord/shared';
import { z } from 'zod';
import { createChannel, zChannelName } from '../../helpers/channels';
import { protectedProcedure } from '../../utils/trpc';

const addChannelRoute = protectedProcedure
  .input(
    z.object({
      type: z.enum(ChannelType),
      name: zChannelName,
      categoryId: z.number()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CHANNELS);

    const channel = await createChannel(input, ctx.user.id);

    return channel.id;
  });

export { addChannelRoute };
