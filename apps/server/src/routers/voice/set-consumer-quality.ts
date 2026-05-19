import { Permission, StreamKind } from '@sharkord/shared';
import { z } from 'zod';
import { getSettings } from '../../db/queries/server';
import { VoiceRuntime } from '../../runtimes/voice';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const qualityToSpatialLayerMap = {
  auto: 2,
  low: 0,
  medium: 1,
  high: 2
};

const setConsumerQualityRoute = protectedProcedure
  .input(
    z.object({
      remoteId: z.number(),
      kind: z.enum([
        StreamKind.VIDEO,
        StreamKind.SCREEN,
        StreamKind.EXTERNAL_VIDEO
      ]),
      quality: z.enum(['auto', 'low', 'medium', 'high'])
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.JOIN_VOICE_CHANNELS);

    invariant(ctx.currentVoiceChannelId, {
      code: 'BAD_REQUEST',
      message: 'User is not in a voice channel'
    });

    const { webRtcSimulcastEnabled } = await getSettings();

    invariant(webRtcSimulcastEnabled, {
      code: 'BAD_REQUEST',
      message: 'Simulcast is not enabled on this server'
    });

    const runtime = VoiceRuntime.findById(ctx.currentVoiceChannelId);

    invariant(runtime, {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Voice runtime not found for this channel'
    });

    const consumer = runtime.getConsumer(
      ctx.user.id,
      input.remoteId,
      input.kind
    );

    invariant(consumer, {
      code: 'NOT_FOUND',
      message: 'Consumer not found'
    });

    if (consumer.type !== 'simulcast') return;

    await consumer.setPreferredLayers({
      spatialLayer: qualityToSpatialLayerMap[input.quality]
    });
  });

export { setConsumerQualityRoute };
