import { StreamKind } from '@sharkord/shared';
import { z } from 'zod';
import { getCurrentVoiceRuntime } from '../../helpers/get-current-voice-runtime';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const setConsumerPlaybackRoute = protectedProcedure
  .input(
    z.object({
      remoteId: z.number().int().positive(),
      kind: z.enum([StreamKind.VIDEO, StreamKind.SCREEN]),
      consumerId: z.uuid(),
      paused: z.boolean()
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { runtime } = await getCurrentVoiceRuntime(ctx);
    const userId = ctx.user.id;

    invariant(runtime.getUser(userId), {
      code: 'BAD_REQUEST',
      message: 'User is not in a voice channel'
    });

    await runtime.setConsumerPlayback(userId, input);
  });

export { setConsumerPlaybackRoute };
