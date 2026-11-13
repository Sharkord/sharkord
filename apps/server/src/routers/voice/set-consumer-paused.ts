import { PAUSABLE_STREAM_KINDS, RateLimiter } from '@sharkord/shared';
import { z } from 'zod';
import { getCurrentVoiceRuntime } from '../../helpers/get-current-voice-runtime';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const setConsumerPausedRoute = protectedProcedure
  .meta({
    rateLimit: RateLimiter.VOICE_STREAM
  })
  .input(
    z.object({
      remoteId: z.number(),
      kind: z.enum(PAUSABLE_STREAM_KINDS),
      paused: z.boolean()
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { runtime } = await getCurrentVoiceRuntime(ctx);

    const consumer = runtime.getConsumer(
      ctx.user.id,
      input.remoteId,
      input.kind
    );

    invariant(consumer, {
      code: 'NOT_FOUND',
      message: 'Consumer not found'
    });

    if (input.paused) {
      await consumer.pause();
    } else {
      await consumer.resume();
    }
  });

export { setConsumerPausedRoute };
