import { getCurrentVoiceRuntime } from '../../helpers/get-current-voice-runtime';
import { protectedProcedure } from '../../utils/trpc';

const getProducersRoute = protectedProcedure.query(async ({ ctx }) => {
  const { runtime } = await getCurrentVoiceRuntime(ctx);

  return runtime.getRemoteIds(ctx.user.id);
});

export { getProducersRoute };
