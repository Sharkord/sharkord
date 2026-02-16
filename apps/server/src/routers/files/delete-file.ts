import { isEmptyMessage, Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { removeFile } from '../../db/mutations/files';
import { publishMessage } from '../../db/publishers';
import { getFilesByMessageId } from '../../db/queries/files';
import { getMessageByFileId } from '../../db/queries/messages';
import { messages } from '../../db/schema';
import { eventBus } from '../../plugins/event-bus';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const deleteFileRoute = protectedProcedure
  .input(z.object({ fileId: z.number() }))
  .mutation(async ({ input, ctx }) => {
    const message = await getMessageByFileId(input.fileId);

    invariant(message, {
      code: 'NOT_FOUND',
      message: 'Message not found'
    });

    invariant(
      message.userId === ctx.user.id ||
        (await ctx.hasPermission(Permission.MANAGE_MESSAGES)),
      {
        code: 'FORBIDDEN',
        message: 'You do not have permission to delete this file'
      }
    );

    await removeFile(input.fileId);

    publishMessage(message.id, message.channelId, 'update');

    const files = await getFilesByMessageId(message.id);

    if (isEmptyMessage(message.content) && files.length == 0) {
      await db.delete(messages).where(eq(messages.id, message.id));

      publishMessage(message.id, message.channelId, 'delete');

      eventBus.emit('message:deleted', {
        channelId: message.channelId,
        messageId: message.id
      });
    }
  });

export { deleteFileRoute };
