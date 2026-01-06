import { ChannelPermission, Permission } from '@sharkord/shared';
import { z } from 'zod';
import { db } from '../../db';
import { publishMessage } from '../../db/publishers';
import { messageFiles, messages } from '../../db/schema';
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
    await Promise.all([
      ctx.needsPermission(Permission.SEND_MESSAGES),
      ctx.needsChannelPermission(
        input.channelId,
        ChannelPermission.SEND_MESSAGES
      )
    ]);

    const message = await db
      .insert(messages)
      .values({
        channelId: input.channelId,
        userId: ctx.userId,
        content: input.content,
        createdAt: Date.now()
      })
      .returning()
      .get();

    if (input.files.length > 0) {
      for (const tempFileId of input.files) {
        const newFile = await fileManager.saveFile(tempFileId, ctx.userId);

        await db.insert(messageFiles).values({
          messageId: message.id,
          fileId: newFile.id,
          createdAt: Date.now()
        });
      }
    }

    publishMessage(message.id, input.channelId, 'create');
    enqueueProcessMetadata(input.content, message.id);

    return message.id;
  });

export { sendMessageRoute };
