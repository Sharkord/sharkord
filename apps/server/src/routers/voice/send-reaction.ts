import { ServerEvents, VOICE_REACTION_EMOJIS } from '@sharkord/shared';
import { z } from 'zod';
import { config } from '../../config';
import { getCurrentVoiceRuntime } from '../../helpers/get-current-voice-runtime';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const sendVoiceReactionRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.voiceReaction.maxRequests,
  windowMs: config.rateLimiters.voiceReaction.windowMs,
  logLabel: 'sendVoiceReaction'
})
  .input(
    z.object({
      emoji: z.enum(VOICE_REACTION_EMOJIS)
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { channelId } = await getCurrentVoiceRuntime(ctx);

    ctx.pubsub.publish(ServerEvents.USER_VOICE_REACTION, {
      channelId,
      userId: ctx.user.id,
      emoji: input.emoji
    });
  });

export { sendVoiceReactionRoute };
