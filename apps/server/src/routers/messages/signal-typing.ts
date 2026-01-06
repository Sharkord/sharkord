import { ServerEvents } from '@sharkord/shared';
import { z } from 'zod';
import { protectedProcedure } from '../../utils/trpc';

const signalTypingRoute = protectedProcedure
  .input(
    z
      .object({
        channelId: z.number()
      })
      .required()
  )
  .mutation(async ({ input, ctx }) => {
    ctx.pubsub.publish(ServerEvents.MESSAGE_TYPING, {
      channelId: input.channelId,
      userId: ctx.userId
    });
  });

export { signalTypingRoute };
