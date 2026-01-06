import { ActivityLogType, Permission } from '@sharkord/shared';
import { z } from 'zod';
import { db } from '../../db';
import { publishEmoji } from '../../db/publishers';
import { getUniqueEmojiName } from '../../db/queries/emojis';
import { emojis } from '../../db/schema';
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

      const emoji = db
        .insert(emojis)
        .values({
          name: uniqueEmojiName,
          fileId: newFile.id,
          userId: ctx.userId,
          createdAt: Date.now()
        })
        .returning()
        .get();

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
