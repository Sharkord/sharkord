import { config } from '../../config';
import { getCurrentVoiceRuntime } from '../../helpers/get-current-voice-runtime';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const createProducerTransportRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.voiceTransport.maxRequests,
  windowMs: config.rateLimiters.voiceTransport.windowMs,
  logLabel: 'createProducerTransport'
}).mutation(async ({ ctx }) => {
  const { runtime } = await getCurrentVoiceRuntime(ctx);

  const params = await runtime.createProducerTransport(ctx.user.id);

  return params;
});

export { createProducerTransportRoute };
