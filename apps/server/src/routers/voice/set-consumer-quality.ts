import { Permission, StreamKind } from '@sharkord/shared';
import { z } from 'zod';
import { getSettings } from '../../db/queries/server';
import { VoiceRuntime } from '../../runtimes/voice';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const setConsumerQualityRoute = protectedProcedure
  .input(
    z.object({
      remoteId: z.number(),
      kind: z.enum([
        StreamKind.VIDEO,
        StreamKind.SCREEN,
        StreamKind.EXTERNAL_VIDEO
      ]),
      quality: z.discriminatedUnion('mode', [
        z.object({ mode: z.literal('auto') }),
        z.object({
          mode: z.literal('layer'),
          spatialLayer: z.number().int().nonnegative()
        })
      ])
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

    const qualityLayers = runtime.getProducerQualityLayers(
      input.remoteId,
      input.kind
    );

    invariant(qualityLayers.length > 0, {
      code: 'BAD_REQUEST',
      message: 'Consumer quality layers are not available'
    });

    const spatialLayer =
      input.quality.mode === 'auto'
        ? qualityLayers[qualityLayers.length - 1]!.spatialLayer
        : input.quality.spatialLayer;

    invariant(
      qualityLayers.some((layer) => layer.spatialLayer === spatialLayer),
      {
        code: 'BAD_REQUEST',
        message: 'Invalid consumer quality layer'
      }
    );

    await consumer.setPreferredLayers({
      spatialLayer
    });
  });

export { setConsumerQualityRoute };
