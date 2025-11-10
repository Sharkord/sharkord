import {
  Permission,
  ServerEvents,
  type TFile,
  type TJoinedMessage
} from '@sharkord/shared';
import { z } from 'zod';
import { addFileMessageRelation } from '../../db/mutations/files/add-file-message-relation';
import { createMessage } from '../../db/mutations/messages/create-message';
import { enqueueProcessMetadata } from '../../queues/message-metadata';
import { fileManager } from '../../utils/file-manager';
import { protectedProcedure } from '../../utils/trpc';

const sendMessageRoute = protectedProcedure
  .input(
    z
      .object({
        content: z.string(),
        channelId: z.number(),
        files: z.array(z.string()).optional()
      })
      .required()
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.SEND_MESSAGES);

    const message = await createMessage({
      channelId: input.channelId,
      userId: ctx.userId,
      content: input.content
    });

    const files: TFile[] = [];

    if (input.files.length > 0) {
      for (const tempFileId of input.files) {
        const newFile = await fileManager.saveFile(tempFileId, ctx.userId);

        await addFileMessageRelation(message.id, newFile.id);

        files.push(newFile);
      }
    }

    const messageWithFiles: TJoinedMessage = {
      ...message,
      files,
      reactions: []
    };

    ctx.pubsub.publish(ServerEvents.NEW_MESSAGE, messageWithFiles);

    enqueueProcessMetadata(input.content, message.id);
  });

export { sendMessageRoute };
