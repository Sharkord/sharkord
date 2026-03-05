import { ChannelPermission, Permission, ServerEvents } from '@sharkord/shared';
import { z } from 'zod';
import { getAffectedUserIdsForChannel } from '../../db/queries/channels';
import { assertDmChannel } from '../../db/queries/dms';
import { protectedProcedure } from '../../utils/trpc';

const signalTypingRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number(),
      parentMessageId: z.number().optional()
    })
  )
  .mutation(async ({ input, ctx }) => {
    const [, , , affectedUserIds] = await Promise.all([
      ctx.needsPermission(Permission.SEND_MESSAGES),
      ctx.needsChannelPermission(
        input.channelId,
        ChannelPermission.SEND_MESSAGES
      ),
      assertDmChannel(input.channelId, ctx.userId),
      getAffectedUserIdsForChannel(input.channelId, {
        permission: ChannelPermission.VIEW_CHANNEL
      })
    ]);

    ctx.pubsub.publishFor(affectedUserIds, ServerEvents.MESSAGE_TYPING, {
      channelId: input.channelId,
      userId: ctx.userId,
      parentMessageId: input.parentMessageId
    });
  });

export { signalTypingRoute };
