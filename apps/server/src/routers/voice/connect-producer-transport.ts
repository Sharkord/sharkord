import { z } from 'zod';
import { getCurrentVoiceRuntime } from '../../helpers/get-current-voice-runtime';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const connectProducerTransportRoute = protectedProcedure
  .input(
    z.object({
      dtlsParameters: z.any()
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { runtime } = await getCurrentVoiceRuntime(ctx);

    const producerTransport = runtime.getProducerTransport(ctx.user.id);

    invariant(producerTransport, {
      code: 'NOT_FOUND',
      message: 'Producer transport not found'
    });

    await producerTransport.connect({ dtlsParameters: input.dtlsParameters });
  });

export { connectProducerTransportRoute };
