import {
  ChannelPermission,
  getMediasoupKind,
  ServerEvents,
  StreamKind
} from '@sharkord/shared';
import { z } from 'zod';
import { config } from '../../config';
import { getCurrentVoiceRuntime } from '../../helpers/get-current-voice-runtime';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const produceRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.voiceStream.maxRequests,
  windowMs: config.rateLimiters.voiceStream.windowMs,
  logLabel: 'produce'
})
  .input(
    z.object({
      transportId: z.string(),
      kind: z.enum(StreamKind),
      rtpParameters: z.any(),
      qualityLayers: z
        .array(
          z.object({
            spatialLayer: z.number().int().nonnegative(),
            label: z.string().trim().min(1)
          })
        )
        .optional()
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { runtime, channelId } = await getCurrentVoiceRuntime(ctx);

    if (input.kind === StreamKind.AUDIO) {
      await ctx.needsChannelPermission(channelId, ChannelPermission.SPEAK);
    } else if (input.kind === StreamKind.VIDEO) {
      await ctx.needsChannelPermission(channelId, ChannelPermission.WEBCAM);
    } else if (input.kind === StreamKind.SCREEN) {
      await ctx.needsChannelPermission(
        channelId,
        ChannelPermission.SHARE_SCREEN
      );
    }

    const producerTransport = runtime.getProducerTransport(ctx.user.id);

    invariant(producerTransport, {
      code: 'NOT_FOUND',
      message: 'Producer transport not found'
    });

    const producer = await producerTransport.produce({
      kind: getMediasoupKind(input.kind),
      rtpParameters: input.rtpParameters,
      appData: { kind: input.kind, userId: ctx.user.id }
    });

    runtime.addProducer(ctx.user.id, input.kind, producer, input.qualityLayers);

    ctx.pubsub.publishForChannel(channelId, ServerEvents.VOICE_NEW_PRODUCER, {
      channelId: channelId,
      remoteId: ctx.user.id,
      kind: input.kind
    });

    return producer.id;
  });

export { produceRoute };
