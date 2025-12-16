import { ChannelType, Permission, ServerEvents } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { channels } from '../../db/schema';
import { logger } from '../../logger';
import { VoiceRuntime } from '../../runtimes/voice';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const joinVoiceRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number(),
      state: z.object({
        micMuted: z.boolean().default(false),
        soundMuted: z.boolean().default(false)
      })
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.JOIN_VOICE_CHANNELS);

    const channel = await db
      .select()
      .from(channels)
      .where(eq(channels.id, input.channelId))
      .get();

    invariant(channel, {
      code: 'NOT_FOUND',
      message: 'Channel not found'
    });

    invariant(channel.type === ChannelType.VOICE, {
      code: 'BAD_REQUEST',
      message: 'Channel is not a voice channel'
    });

    const userAlreadyInVoiceChannel = VoiceRuntime.findRuntimeByUserId(
      ctx.user.id
    );

    invariant(!userAlreadyInVoiceChannel, {
      code: 'BAD_REQUEST',
      message: 'User already in a voice channel'
    });

    const runtime = VoiceRuntime.findById(input.channelId);

    invariant(runtime, {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Voice runtime not found for this channel'
    });

    runtime.addUser(ctx.user.id, input.state);

    const state = runtime.getUserState(ctx.user.id);

    ctx.currentVoiceChannelId = channel.id;
    ctx.pubsub.publish(ServerEvents.USER_JOIN_VOICE, {
      channelId: input.channelId,
      userId: ctx.user.id,
      state
    });

    logger.info('%s joined voice channel %s', ctx.user.name, channel.name);

    const router = runtime.getRouter();

    return {
      routerRtpCapabilities: router.rtpCapabilities
    };
  });

export { joinVoiceRoute };
