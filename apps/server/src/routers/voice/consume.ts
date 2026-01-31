import { Permission, ServerEvents, StreamKind } from '@sharkord/shared';
import { z } from 'zod';
import { VoiceRuntime } from '../../runtimes/voice';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const consumeRoute = protectedProcedure
  .input(
    z.object({
      kind: z.enum(StreamKind),
      remoteId: z.number(),
      rtpCapabilities: z.any()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.JOIN_VOICE_CHANNELS);

    invariant(ctx.currentVoiceChannelId, {
      code: 'BAD_REQUEST',
      message: 'User is not in a voice channel'
    });

    const runtime = VoiceRuntime.findById(ctx.currentVoiceChannelId);

    invariant(runtime, {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Voice runtime not found for this channel'
    });

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

    runtime.addConsumer(ctx.user.id, input.remoteId, consumer);

    consumer.on('producerclose', () => {
      if (!ctx.currentVoiceChannelId) return;

      ctx.pubsub.publishForChannel(
        ctx.currentVoiceChannelId,
        ServerEvents.VOICE_PRODUCER_CLOSED,
        {
          channelId: ctx.currentVoiceChannelId,
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
      consumerType: consumer.type
    };
  });

export { consumeRoute };
