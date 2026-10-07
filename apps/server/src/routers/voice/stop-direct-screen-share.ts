import {
  ChannelPermission,
  DIRECT_SCREEN_SHARE_MAX_ATTEMPTS,
  Permission
} from '@sharkord/shared';
import { z } from 'zod';
import { config } from '../../config';
import { assertDirectScreenShareParticipant } from '../../helpers/assert-direct-screen-share';
import { getCurrentVoiceRuntime } from '../../helpers/get-current-voice-runtime';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const stopDirectScreenShareRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.voiceStream.maxRequests,
  windowMs: config.rateLimiters.voiceStream.windowMs,
  logLabel: 'stopDirectScreenShare'
})
  .input(
    z.object({
      sessionId: z.uuid(),
      attempt: z.number().int().min(1).max(DIRECT_SCREEN_SHARE_MAX_ATTEMPTS)
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { runtime, channelId } = await getCurrentVoiceRuntime(ctx);

    await ctx.needsPermission(Permission.SHARE_SCREEN);
    await ctx.needsChannelPermission(channelId, ChannelPermission.SHARE_SCREEN);

    assertDirectScreenShareParticipant(runtime, ctx.user.id);

    invariant(runtime.getDirectScreenSharePeer(ctx.user.id), {
      code: 'BAD_REQUEST',
      message: 'Direct screen share negotiation was not found'
    });

    invariant(
      runtime.getDirectScreenShareSession(ctx.user.id) === input.sessionId &&
        runtime.getDirectScreenShareAttempt(ctx.user.id) === input.attempt,
      {
        code: 'BAD_REQUEST',
        message: 'Direct screen share stop belongs to an inactive attempt'
      }
    );

    runtime.stopDirectScreenShare(ctx.user.id);
  });

export { stopDirectScreenShareRoute };
