import { getCurrentVoiceRuntime } from '../../helpers/get-current-voice-runtime';
import { protectedProcedure } from '../../utils/trpc';

const createConsumerTransportRoute = protectedProcedure.mutation(
  async ({ ctx }) => {
    const { runtime } = await getCurrentVoiceRuntime(ctx);

    const params = await runtime.createConsumerTransport(ctx.user.id);

    return params;
  }
);

export { createConsumerTransportRoute };
