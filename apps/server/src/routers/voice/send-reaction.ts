import {
  Permission,
  REACTION_EMOJI_MAX_LENGTH,
  ServerEvents
} from '@sharkord/shared';
import { z } from 'zod';
import { config } from '../../config';
import { getCurrentVoiceRuntime } from '../../helpers/get-current-voice-runtime';
import { resolveKnownEmojiFileId } from '../../helpers/resolve-known-emoji-file-id';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const sendVoiceReactionRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.voiceReaction.maxRequests,
  windowMs: config.rateLimiters.voiceReaction.windowMs,
  logLabel: 'sendVoiceReaction'
})
  .input(
    z.object({
      emoji: z.string().min(1).max(REACTION_EMOJI_MAX_LENGTH)
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.SEND_VOICE_REACTION);

    const { channelId } = await getCurrentVoiceRuntime(ctx);

    await resolveKnownEmojiFileId(input.emoji);

    ctx.pubsub.publish(ServerEvents.USER_VOICE_REACTION, {
      channelId,
      userId: ctx.user.id,
      emoji: input.emoji
    });
  });

export { sendVoiceReactionRoute };
