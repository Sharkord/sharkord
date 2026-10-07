import { ServerEvents } from '@sharkord/shared';
import { z } from 'zod';
import { config } from '../../config';
import {
  assertDirectScreenSharePair,
  assertDirectScreenShareParticipant,
  assertDirectScreenSharePermission
} from '../../helpers/assert-direct-screen-share';
import { getCurrentVoiceRuntime } from '../../helpers/get-current-voice-runtime';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const directScreenShareSignalInput = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('answer'),
    sharerId: z.number().int().positive(),
    description: z.object({
      type: z.literal('answer'),
      sdp: z.string().trim().min(1).max(65_536)
    })
  }),
  z.object({
    type: z.literal('candidate'),
    sharerId: z.number().int().positive(),
    candidate: z.object({
      candidate: z.string().max(4096),
      sdpMid: z.string().max(256).nullable().optional(),
      sdpMLineIndex: z.number().int().nonnegative().nullable().optional(),
      usernameFragment: z.string().max(256).nullable().optional()
    })
  })
]);

const signalDirectScreenShareRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.voiceStream.maxRequests,
  windowMs: config.rateLimiters.voiceStream.windowMs,
  logLabel: 'signalDirectScreenShare'
})
  .input(directScreenShareSignalInput)
  .mutation(async ({ input, ctx }) => {
    const { runtime, channelId } = await getCurrentVoiceRuntime(ctx);

    assertDirectScreenShareParticipant(runtime, ctx.user.id);

    const receiverId = runtime.getDirectScreenSharePeer(input.sharerId);

    invariant(receiverId, {
      code: 'BAD_REQUEST',
      message: 'Direct screen share negotiation was not found'
    });

    const { receiver } = assertDirectScreenSharePair(
      runtime,
      input.sharerId,
      receiverId
    );

    const isSharer = ctx.user.id === input.sharerId;
    const isReceiver = ctx.user.id === receiver.userId;

    invariant(isSharer || isReceiver, {
      code: 'BAD_REQUEST',
      message: 'User is not part of this direct screen share'
    });

    if (input.type === 'answer') {
      invariant(isReceiver, {
        code: 'BAD_REQUEST',
        message: 'Only the receiving participant can answer an offer'
      });
    }

    await assertDirectScreenSharePermission(channelId, input.sharerId);

    const peerUserId = isSharer ? receiverId : input.sharerId;

    if (input.type === 'answer') {
      ctx.pubsub.publishFor(
        peerUserId,
        ServerEvents.VOICE_P2P_SCREEN_SHARE_SIGNAL,
        {
          channelId,
          senderId: ctx.user.id,
          sharerId: input.sharerId,
          type: 'answer',
          description: input.description
        }
      );
    } else {
      ctx.pubsub.publishFor(
        peerUserId,
        ServerEvents.VOICE_P2P_SCREEN_SHARE_SIGNAL,
        {
          channelId,
          senderId: ctx.user.id,
          sharerId: input.sharerId,
          type: 'candidate',
          candidate: input.candidate
        }
      );
    }
  });

export { signalDirectScreenShareRoute };
