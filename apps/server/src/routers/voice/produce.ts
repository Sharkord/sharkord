import {
  ChannelPermission,
  getMediasoupKind,
  Permission,
  PRODUCIBLE_STREAM_KINDS,
  ServerEvents,
  StreamKind,
  type TProducibleStreamKind
} from '@sharkord/shared';
import { z } from 'zod';
import { config } from '../../config';
import { getCurrentVoiceRuntime } from '../../helpers/get-current-voice-runtime';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const KIND_PERMISSIONS: Record<
  TProducibleStreamKind,
  { channel: ChannelPermission; server?: Permission }
> = {
  [StreamKind.AUDIO]: { channel: ChannelPermission.SPEAK },
  [StreamKind.VIDEO]: {
    channel: ChannelPermission.WEBCAM,
    server: Permission.ENABLE_WEBCAM
  },
  [StreamKind.SCREEN]: {
    channel: ChannelPermission.SHARE_SCREEN,
    server: Permission.SHARE_SCREEN
  },
  [StreamKind.SCREEN_AUDIO]: {
    channel: ChannelPermission.SHARE_SCREEN,
    server: Permission.SHARE_SCREEN
  }
};

const produceRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.voiceStream.maxRequests,
  windowMs: config.rateLimiters.voiceStream.windowMs,
  logLabel: 'produce'
})
  .input(
    z.object({
      transportId: z.string(),
      kind: z.enum(PRODUCIBLE_STREAM_KINDS),
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

    const { channel, server } = KIND_PERMISSIONS[input.kind];

    await ctx.needsChannelPermission(channelId, channel);

    if (server) {
      await ctx.needsPermission(server);
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
