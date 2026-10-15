import { ChannelPermission, Permission } from '@sharkord/shared';
import { z } from 'zod';
import { config } from '../../config';
import { assertChannelAccess } from '../../helpers/assert-channel-access';
import {
  loadVoiceMoveDestination,
  moveVoiceUser
} from '../../helpers/voice-moderation';
import { logger } from '../../logger';
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

    const channel = await loadVoiceMoveDestination(input.channelId);

    // the mover must be able to see the destination themselves, not only hold
    // JOIN on it. Deliberate and known: the *target* does not need either, so a
    // move can pull someone into a private voice channel they cannot normally
    // see, and publishHiddenChannelToUser then reveals it to them. That is the
    // intended moderation capability, not an oversight
    await assertChannelAccess(ctx, input.channelId);
    await ctx.needsChannelPermission(input.channelId, ChannelPermission.JOIN);

    await moveVoiceUser(input.userId, input.channelId);

    logger.info(
      '%s moved user %s to voice channel %s',
      ctx.user.name,
      input.userId,
      channel.name
    );
  });

export { moveUserRoute };
