import { getCurrentVoiceRuntime } from '../../helpers/get-current-voice-runtime';
import { protectedProcedure } from '../../utils/trpc';

const createProducerTransportRoute = protectedProcedure.mutation(
  async ({ ctx }) => {
    const { runtime } = await getCurrentVoiceRuntime(ctx);

    const params = await runtime.createProducerTransport(ctx.user.id);

    return params;
  }
);

export { createProducerTransportRoute };
