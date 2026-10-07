import { ChannelPermission, Permission } from '@sharkord/shared';
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
  .input(z.object({}))
  .mutation(async ({ ctx }) => {
    const { runtime, channelId } = await getCurrentVoiceRuntime(ctx);

    await ctx.needsPermission(Permission.SHARE_SCREEN);
    await ctx.needsChannelPermission(channelId, ChannelPermission.SHARE_SCREEN);

    assertDirectScreenShareParticipant(runtime, ctx.user.id);

    invariant(runtime.getDirectScreenSharePeer(ctx.user.id), {
      code: 'BAD_REQUEST',
      message: 'Direct screen share negotiation was not found'
    });

    runtime.stopDirectScreenShare(ctx.user.id);
  });

export { stopDirectScreenShareRoute };
