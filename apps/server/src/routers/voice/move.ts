import {
  ChannelPermission,
  ChannelType,
  Permission,
  ServerEvents
} from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db';
import { publishHiddenChannelToUser } from '../../db/publishers';
import { userCan } from '../../db/queries/roles';
import { channels } from '../../db/schema';
import { assertChannelAccess } from '../../helpers/assert-channel-access';
import { grantVoiceMove } from '../../helpers/voice-move-grants';
import { logger } from '../../logger';
import { VoiceRuntime } from '../../runtimes/voice';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const moveUserRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.moveMembers.maxRequests,
  windowMs: config.rateLimiters.moveMembers.windowMs,
  logLabel: 'moveUser'
})
  .input(
    z.object({
      userId: z.number(),
      channelId: z.number()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MOVE_MEMBERS);

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

    // the mover must be able to see the destination themselves, not only hold
    // JOIN on it. Deliberate and known: the *target* does not need either, so a
    // move can pull someone into a private voice channel they cannot normally
    // see, and publishHiddenChannelToUser then reveals it to them. That is the
    // intended moderation capability, not an oversight
    await assertChannelAccess(ctx, input.channelId);
    await ctx.needsChannelPermission(input.channelId, ChannelPermission.JOIN);

    const canUseVoice = await userCan(
      input.userId,
      Permission.JOIN_VOICE_CHANNELS
    );

    invariant(canUseVoice, {
      code: 'FORBIDDEN',
      message: 'Target user is not allowed to use voice channels'
    });

    const currentRuntime = VoiceRuntime.findRuntimeByUserId(input.userId);

    invariant(currentRuntime, {
      code: 'BAD_REQUEST',
      message: 'User is not in a voice channel'
    });

    const originChannel = await db
      .select({ isDm: channels.isDm })
      .from(channels)
      .where(eq(channels.id, currentRuntime.id))
      .limit(1)
      .get();

    // dm calls are private to their participants, moderation does not reach into
    // them. same message as above so this does not leak that the user is in a dm
    invariant(!originChannel?.isDm, {
      code: 'BAD_REQUEST',
      message: 'User is not in a voice channel'
    });

    invariant(currentRuntime.id !== input.channelId, {
      code: 'BAD_REQUEST',
      message: 'User is already in that channel'
    });

    grantVoiceMove(input.userId, input.channelId);

    await publishHiddenChannelToUser(input.userId, input.channelId);

    ctx.pubsub.publishFor(input.userId, ServerEvents.USER_VOICE_MOVED, {
      channelId: input.channelId,
      fromChannelId: currentRuntime.id
    });

    logger.info(
      '%s moved user %s to voice channel %s',
      ctx.user.name,
      input.userId,
      channel.name
    );
  });

export { moveUserRoute };
