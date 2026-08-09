import { isEmptyMessage, Permission } from '@sharkord/shared';
import { z } from 'zod';
import { removeFile } from '../../db/mutations/files';
import { deleteMessage } from '../../db/mutations/messages';
import { publishMessage } from '../../db/publishers';
import { getFilesByMessageId } from '../../db/queries/files';
import { getMessageByFileId } from '../../db/queries/messages';
import { assertChannelAccess } from '../../helpers/assert-channel-access';
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

    await assertChannelAccess(ctx, message.channelId);

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
      await deleteMessage({
        id: message.id,
        channelId: message.channelId,
        parentMessageId: message.parentMessageId
      });
    }
  });

export { deleteFileRoute };
