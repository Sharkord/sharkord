import { Permission } from '@sharkord/shared';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { removeFile } from '../../db/mutations/files/remove-file';
import { removeMessage } from '../../db/mutations/messages/remove-message';
import { publishMessage } from '../../db/publishers';
import { getFilesByMessageId } from '../../db/queries/files/get-files-by-message-id';
import { getMessage } from '../../db/queries/messages/get-message';
import { protectedProcedure } from '../../utils/trpc';

const deleteMessageRoute = protectedProcedure
  .input(z.object({ messageId: z.number() }))
  .mutation(async ({ input, ctx }) => {
    const targetMessage = await getMessage(input.messageId);

    if (!targetMessage) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    if (
      targetMessage.userId !== ctx.user.id &&
      !(await ctx.hasPermission(Permission.MANAGE_MESSAGES))
    ) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const files = await getFilesByMessageId(input.messageId);

    if (files.length > 0) {
      const promises = files.map(async (file) => {
        await removeFile(file.id);
      });

      await Promise.all(promises);
    }

    await removeMessage(input.messageId);

    publishMessage(input.messageId, 'delete');
  });

export { deleteMessageRoute };
