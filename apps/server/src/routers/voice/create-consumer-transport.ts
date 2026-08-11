import { config } from '../../config';
import { getCurrentVoiceRuntime } from '../../helpers/get-current-voice-runtime';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const createConsumerTransportRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.voiceTransport.maxRequests,
  windowMs: config.rateLimiters.voiceTransport.windowMs,
  logLabel: 'createConsumerTransport'
}).mutation(async ({ ctx }) => {
  const { runtime } = await getCurrentVoiceRuntime(ctx);

  const params = await runtime.createConsumerTransport(ctx.user.id);

  return params;
});

export { createConsumerTransportRoute };
