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
import { channelUserCan } from '../../db/queries/channels';
import { userCan } from '../../db/queries/roles';
import { channels } from '../../db/schema';
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

    const [canView, canJoin, canUseVoice] = await Promise.all([
      channelUserCan(
        input.channelId,
        input.userId,
        ChannelPermission.VIEW_CHANNEL
      ),
      channelUserCan(input.channelId, input.userId, ChannelPermission.JOIN),
      userCan(input.userId, Permission.JOIN_VOICE_CHANNELS)
    ]);

    invariant(canView && canJoin && canUseVoice, {
      code: 'FORBIDDEN',
      message: 'Target user cannot join the destination channel'
    });

    const currentRuntime = VoiceRuntime.findRuntimeByUserId(input.userId);

    invariant(currentRuntime, {
      code: 'BAD_REQUEST',
      message: 'User is not in a voice channel'
    });

    invariant(currentRuntime.id !== input.channelId, {
      code: 'BAD_REQUEST',
      message: 'User is already in that channel'
    });

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
