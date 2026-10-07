import { ChannelPermission, Permission, ServerEvents } from '@sharkord/shared';
import { z } from 'zod';
import { config } from '../../config';
import {
  assertDirectScreenSharePair,
  assertDirectScreenShareParticipant
} from '../../helpers/assert-direct-screen-share';
import { getCurrentVoiceRuntime } from '../../helpers/get-current-voice-runtime';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const startDirectScreenShareRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.voiceStream.maxRequests,
  windowMs: config.rateLimiters.voiceStream.windowMs,
  logLabel: 'startDirectScreenShare'
})
  .input(
    z.object({
      description: z.object({
        type: z.literal('offer'),
        sdp: z.string().trim().min(1).max(65_536)
      })
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { runtime, channelId } = await getCurrentVoiceRuntime(ctx);

    await ctx.needsPermission(Permission.SHARE_SCREEN);
    await ctx.needsChannelPermission(channelId, ChannelPermission.SHARE_SCREEN);

    const sharer = assertDirectScreenShareParticipant(runtime, ctx.user.id);

    invariant(runtime.getState().users.length === 2, {
      code: 'BAD_REQUEST',
      message: 'Direct screen sharing is only available with two participants'
    });

    const receiverId = runtime
      .getState()
      .users.find((user) => user.userId !== ctx.user.id)?.userId;

    invariant(receiverId, {
      code: 'BAD_REQUEST',
      message: 'A receiving participant was not found'
    });

    const { receiver } = assertDirectScreenSharePair(
      runtime,
      sharer.userId,
      receiverId
    );

    invariant(!runtime.hasDirectScreenShare(ctx.user.id), {
      code: 'BAD_REQUEST',
      message: 'A direct screen share is already active'
    });

    invariant(!runtime.hasDirectScreenShare(receiver.userId), {
      code: 'BAD_REQUEST',
      message: 'A direct screen share is already active'
    });

    invariant(runtime.startDirectScreenShare(ctx.user.id, receiverId), {
      code: 'BAD_REQUEST',
      message: 'A direct screen share is already active'
    });

    ctx.pubsub.publishFor(
      receiverId,
      ServerEvents.VOICE_P2P_SCREEN_SHARE_SIGNAL,
      {
        channelId,
        senderId: ctx.user.id,
        sharerId: ctx.user.id,
        type: 'offer',
        description: input.description
      }
    );

    return { peerUserId: receiverId };
  });

export { startDirectScreenShareRoute };
