import { z } from 'zod';
import { assertChannelAccess } from '../../helpers/assert-channel-access';
import { markChannelAsRead } from '../../helpers/mark-channel-as-read';
import { protectedProcedure } from '../../utils/trpc';

const markAsReadRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await assertChannelAccess(ctx, input.channelId);

    await markChannelAsRead(ctx.userId, input.channelId);
  });

export { markAsReadRoute };
