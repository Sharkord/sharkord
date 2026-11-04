import {
  Permission,
  RateLimiter,
  REACTION_EMOJI_MAX_LENGTH,
  ServerEvents
} from '@sharkord/shared';
import { z } from 'zod';
import { getCurrentVoiceRuntime } from '../../helpers/get-current-voice-runtime';
import { resolveKnownEmojiFileId } from '../../helpers/resolve-known-emoji-file-id';
import { protectedProcedure } from '../../utils/trpc';

const sendVoiceReactionRoute = protectedProcedure
  .meta({ rateLimit: RateLimiter.VOICE_REACTION })
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
