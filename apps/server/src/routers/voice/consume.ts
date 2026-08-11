import { ServerEvents, StreamKind } from '@sharkord/shared';
import { z } from 'zod';
import { config } from '../../config';
import { getCurrentVoiceRuntime } from '../../helpers/get-current-voice-runtime';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const consumeRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.voiceStream.maxRequests,
  windowMs: config.rateLimiters.voiceStream.windowMs,
  logLabel: 'consume'
})
  .input(
    z.object({
      kind: z.enum(StreamKind),
      remoteId: z.number(),
      rtpCapabilities: z.any()
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { runtime, channelId } = await getCurrentVoiceRuntime(ctx);

    const producer = runtime.getProducer(input.kind, input.remoteId);

    invariant(producer, {
      code: 'NOT_FOUND',
      message: 'Producer not found'
    });

    const userConsumerTransport = runtime.getConsumerTransport(ctx.user.id);

    invariant(userConsumerTransport, {
      code: 'NOT_FOUND',
      message: 'Consumer transport not found'
    });

    const router = runtime.getRouter();
    const routerCanConsume = router.canConsume({
      producerId: producer.id,
      rtpCapabilities: input.rtpCapabilities
    });

    invariant(routerCanConsume, {
      code: 'BAD_REQUEST',
      message: 'Cannot consume this producer with the given RTP capabilities'
    });

    const consumer = await userConsumerTransport.consume({
      producerId: producer.id,
      rtpCapabilities: input.rtpCapabilities,
      paused: false
    });

    runtime.addConsumer(ctx.user.id, input.remoteId, input.kind, consumer);

    consumer.on('producerclose', () => {
      if (!channelId) return;

      ctx.pubsub.publishForChannel(
        channelId,
        ServerEvents.VOICE_PRODUCER_CLOSED,
        {
          channelId: channelId,
          remoteId: input.remoteId,
          kind: input.kind
        }
      );
    });

    return {
      producerId: producer.id,
      consumerId: consumer.id,
      consumerKind: input.kind,
      consumerRtpParameters: consumer.rtpParameters,
      consumerType: consumer.type,
      qualityLayers: runtime.getProducerQualityLayers(
        input.remoteId,
        input.kind
      )
    };
  });

export { consumeRoute };
