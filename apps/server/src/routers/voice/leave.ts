import { ChannelType, Permission, ServerEvents } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { channels } from '../../db/schema';
import { logger } from '../../logger';
import { VoiceRuntime } from '../../runtimes/voice';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const leaveVoiceRoute = protectedProcedure.mutation(async ({ ctx }) => {
  await ctx.needsPermission(Permission.JOIN_VOICE_CHANNELS);

  invariant(ctx.currentVoiceChannelId, {
    code: 'BAD_REQUEST',
    message: 'User is not in a voice channel'
  });

  const channel = await db
    .select()
    .from(channels)
    .where(eq(channels.id, ctx.currentVoiceChannelId))
    .get();

  invariant(channel, {
    code: 'NOT_FOUND',
    message: 'Channel not found'
  });

  invariant(channel.type === ChannelType.VOICE, {
    code: 'BAD_REQUEST',
    message: 'Channel is not a voice channel'
  });

  const runtime = VoiceRuntime.findById(ctx.currentVoiceChannelId);

  invariant(runtime, {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Voice runtime not found for this channel'
  });

  const userInChannel = runtime.getUser(ctx.user.id);

  invariant(userInChannel, {
    code: 'BAD_REQUEST',
    message: 'User not in voice channel'
  });

  runtime.removeUser(ctx.user.id);

  ctx.pubsub.publish(ServerEvents.USER_LEAVE_VOICE, {
    channelId: ctx.currentVoiceChannelId,
    userId: ctx.user.id
  });
  ctx.currentVoiceChannelId = undefined;

  logger.info('%s left voice channel %s', ctx.user.name, channel.name);
});

export { leaveVoiceRoute };
