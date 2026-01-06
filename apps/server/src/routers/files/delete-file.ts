import { z } from 'zod';
import { removeFile } from '../../db/mutations/files';
import { publishMessage } from '../../db/publishers';
import { getMessageByFileId } from '../../db/queries/messages';
import { protectedProcedure } from '../../utils/trpc';

const deleteFileRoute = protectedProcedure
  .input(z.object({ fileId: z.number() }))
  .mutation(async ({ input }) => {
    const message = await getMessageByFileId(input.fileId);

    await removeFile(input.fileId);

    if (!message) return;

    publishMessage(message.id, message.channelId, 'update');
  });

export { deleteFileRoute };
