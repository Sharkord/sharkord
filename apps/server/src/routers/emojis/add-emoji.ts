import { ActivityLogType, Permission } from '@sharkord/shared';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createEmoji } from '../../db/mutations/emojis/create-emoji';
import { getUniqueEmojiName } from '../../db/mutations/emojis/get-unique-emoji-name';
import { publishEmoji } from '../../db/publishers';
import { enqueueActivityLog } from '../../queues/activity-log';
import { fileManager } from '../../utils/file-manager';
import { protectedProcedure } from '../../utils/trpc';

const addEmojiRoute = protectedProcedure
  .input(
    z.array(
      z.object({
        fileId: z.string(),
        name: z.string().min(1).max(32)
      })
    )
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_EMOJIS);

    for (const data of input) {
      const newFile = await fileManager.saveFile(data.fileId, ctx.userId);
      const uniqueEmojiName = await getUniqueEmojiName(data.name);

      const emoji = await createEmoji({
        name: uniqueEmojiName,
        userId: ctx.userId,
        fileId: newFile.id,
        createdAt: Date.now()
      });

      if (!emoji) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Could not create emoji'
        });
      }

      publishEmoji(emoji.id, 'create');
      enqueueActivityLog({
        type: ActivityLogType.CREATED_EMOJI,
        userId: ctx.user.id,
        details: {
          name: emoji.name
        }
      });
    }
  });

export { addEmojiRoute };
