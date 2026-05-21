import { z } from 'zod';
import { getMessage } from '../../db/queries/messages';
import { assertChannelAccess } from '../../helpers/assert-channel-access';
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

    await assertChannelAccess(ctx, message.channelId);

    return message;
  });

export { getMessageRoute };
