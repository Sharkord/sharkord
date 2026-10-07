import {
  ChannelPermission,
  DIRECT_SCREEN_SHARE_MAX_ATTEMPTS,
  Permission,
  ServerEvents
} from '@sharkord/shared';
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
      sessionId: z.uuid(),
      attempt: z.number().int().min(1).max(DIRECT_SCREEN_SHARE_MAX_ATTEMPTS),
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

    const currentReceiverId = runtime.getDirectScreenSharePeer(ctx.user.id);

    if (currentReceiverId === undefined) {
      invariant(
        input.attempt === 1 &&
          !runtime.hasDirectScreenShare(ctx.user.id) &&
          !runtime.hasDirectScreenShare(receiver.userId),
        {
          code: 'BAD_REQUEST',
          message: 'A direct screen share is already active'
        }
      );
    } else {
      const currentAttempt = runtime.getDirectScreenShareAttempt(ctx.user.id);
      const currentSession = runtime.getDirectScreenShareSession(ctx.user.id);

      if (
        currentReceiverId === receiverId &&
        currentSession === input.sessionId &&
        currentAttempt === input.attempt &&
        runtime.getPendingDirectScreenShareOffer(receiverId)?.description
          .sdp === input.description.sdp
      ) {
        return { peerUserId: receiverId };
      }

      invariant(
        currentReceiverId === receiverId &&
          currentSession === input.sessionId &&
          currentAttempt !== undefined &&
          input.attempt === currentAttempt + 1,
        {
          code: 'BAD_REQUEST',
          message:
            currentReceiverId === receiverId && currentAttempt === input.attempt
              ? 'A direct screen share is already active'
              : 'Direct screen share retry is not valid'
        }
      );
    }

    invariant(
      runtime.startDirectScreenShare(
        ctx.user.id,
        receiverId,
        input.attempt,
        input.description,
        input.sessionId
      ),
      {
        code: 'BAD_REQUEST',
        message: 'A direct screen share is already active'
      }
    );

    ctx.pubsub.publishFor(
      receiverId,
      ServerEvents.VOICE_P2P_SCREEN_SHARE_SIGNAL,
      {
        channelId,
        senderId: ctx.user.id,
        sharerId: ctx.user.id,
        sessionId: input.sessionId,
        type: 'offer',
        attempt: input.attempt,
        description: input.description
      }
    );

    return { peerUserId: receiverId };
  });

export { startDirectScreenShareRoute };
