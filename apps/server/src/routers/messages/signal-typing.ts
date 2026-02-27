import { ChannelPermission, Permission, ServerEvents } from '@sharkord/shared';
import { z } from 'zod';
import { getAffectedUserIdsForChannel } from '../../db/queries/channels';
import {
  assertDmParticipant,
  isDirectMessageChannel
} from '../../db/queries/dms';
import { getSettings } from '../../db/queries/server';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const signalTypingRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number(),
      parentMessageId: z.number().optional()
    })
  )
  .mutation(async ({ input, ctx }) => {
    const [isDmChannel, settings] = await Promise.all([
      isDirectMessageChannel(input.channelId),
      getSettings()
    ]);

    if (isDmChannel) {
      invariant(settings.directMessagesEnabled, {
        code: 'FORBIDDEN',
        message: 'Direct messages are disabled on this server'
      });

      await assertDmParticipant(input.channelId, ctx.userId);
    }

    await Promise.all([
      ctx.needsPermission(Permission.SEND_MESSAGES),
      ctx.needsChannelPermission(
        input.channelId,
        ChannelPermission.SEND_MESSAGES
      )
    ]);

    // TODO: this getAffectedUserIdsForChannel function NEEDS to be optimized AND bullet proof to keep this here
    const affectedUserIds = await getAffectedUserIdsForChannel(
      input.channelId,
      { permission: ChannelPermission.VIEW_CHANNEL }
    );

    ctx.pubsub.publishFor(affectedUserIds, ServerEvents.MESSAGE_TYPING, {
      channelId: input.channelId,
      userId: ctx.userId,
      parentMessageId: input.parentMessageId
    });
  });

export { signalTypingRoute };
