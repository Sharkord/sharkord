import { z } from 'zod';
import { config } from '../../config';
import { assertChannelAccess } from '../../helpers/assert-channel-access';
import { markChannelAsRead } from '../../helpers/mark-channel-as-read';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const markAsReadRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.markAsRead.maxRequests,
  windowMs: config.rateLimiters.markAsRead.windowMs,
  logLabel: 'markAsRead'
})
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
