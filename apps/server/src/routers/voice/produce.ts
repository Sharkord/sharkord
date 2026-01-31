import {
  ChannelPermission,
  getMediasoupKind,
  Permission,
  ServerEvents,
  StreamKind
} from '@sharkord/shared';
import { z } from 'zod';
import { VoiceRuntime } from '../../runtimes/voice';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const produceRoute = protectedProcedure
  .input(
    z.object({
      transportId: z.string(),
      kind: z.enum(StreamKind),
      rtpParameters: z.any()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.JOIN_VOICE_CHANNELS);

    invariant(ctx.currentVoiceChannelId, {
      code: 'BAD_REQUEST',
      message: 'User is not in a voice channel'
    });

    if (input.kind === StreamKind.AUDIO) {
      await ctx.needsChannelPermission(
        ctx.currentVoiceChannelId,
        ChannelPermission.SPEAK
      );
    } else if (input.kind === StreamKind.VIDEO) {
      await ctx.needsChannelPermission(
        ctx.currentVoiceChannelId,
        ChannelPermission.WEBCAM
      );
    } else if (input.kind === StreamKind.SCREEN) {
      await ctx.needsChannelPermission(
        ctx.currentVoiceChannelId,
        ChannelPermission.SHARE_SCREEN
      );
    }

    const runtime = VoiceRuntime.findById(ctx.currentVoiceChannelId);

    invariant(runtime, {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Voice runtime not found for this channel'
    });

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

    runtime.addProducer(ctx.user.id, input.kind, producer);

    ctx.pubsub.publishForChannel(
      ctx.currentVoiceChannelId,
      ServerEvents.VOICE_NEW_PRODUCER,
      {
        channelId: ctx.currentVoiceChannelId,
        remoteId: ctx.user.id,
        kind: input.kind
      }
    );

    return producer.id;
  });

export { produceRoute };
