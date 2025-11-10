import { Permission } from '@sharkord/shared';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { updateMessage } from '../../db/mutations/messages/update-message';
import { publishMessage } from '../../db/publishers';
import { getRawMessage } from '../../db/queries/messages/get-raw-message';
import { enqueueProcessMetadata } from '../../queues/message-metadata';
import { protectedProcedure } from '../../utils/trpc';

const editMessageRoute = protectedProcedure
  .input(
    z.object({
      messageId: z.number(),
      content: z.string()
    })
  )
  .mutation(async ({ input, ctx }) => {
    const message = await getRawMessage(input.messageId);

    if (!message) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Message not found' });
    }

    if (
      message.userId !== ctx.user.id &&
      !(await ctx.hasPermission(Permission.MANAGE_MESSAGES))
    ) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions'
      });
    }

    const updatedMessage = await updateMessage(input.messageId, {
      content: input.content
    });

    if (!updatedMessage) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update message'
      });
    }

    publishMessage(updatedMessage.id, 'update');
    enqueueProcessMetadata(input.content, updatedMessage.id);
  });

export { editMessageRoute };
