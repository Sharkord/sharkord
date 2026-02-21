import { ServerEvents } from '@sharkord/shared';
import { z } from 'zod';
import { protectedProcedure } from '../../utils/trpc';

const signalTypingRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number(),
      parentMessageId: z.number().optional()
    })
  )
  .mutation(async ({ input, ctx }) => {
    ctx.pubsub.publish(ServerEvents.MESSAGE_TYPING, {
      channelId: input.channelId,
      userId: ctx.userId,
      parentMessageId: input.parentMessageId
    });
  });

export { signalTypingRoute };
