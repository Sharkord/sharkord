import { ChannelPermission } from '@sharkord/shared';
import { z } from 'zod';
import { assertDmParticipant } from '../../db/queries/dms';
import { getMessage } from '../../db/queries/messages';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const getMessageRoute = protectedProcedure
  .input(
    z.object({
      messageId: z.number()
    })
  )
  .query(async ({ ctx, input }) => {
    const message = await getMessage(input.messageId);

    invariant(message, {
      code: 'NOT_FOUND',
      message: 'Message not found'
    });

    await assertDmParticipant(message.channelId, ctx.userId);

    await ctx.needsChannelPermission(
      message.channelId,
      ChannelPermission.VIEW_CHANNEL
    );

    return message;
  });

export { getMessageRoute };
