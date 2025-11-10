import { z } from 'zod';
import { removeFile } from '../../db/mutations/files/remove-file';
import { publishMessage } from '../../db/publishers';
import { getMessageByFileId } from '../../db/queries/messages/get-message-by-file-id';
import { protectedProcedure } from '../../utils/trpc';

const deleteFileRoute = protectedProcedure
  .input(z.object({ fileId: z.number() }))
  .mutation(async ({ input }) => {
    const message = await getMessageByFileId(input.fileId);

    await removeFile(input.fileId);

    if (!message) return;

    await publishMessage(message.id, 'update');
  });

export { deleteFileRoute };
