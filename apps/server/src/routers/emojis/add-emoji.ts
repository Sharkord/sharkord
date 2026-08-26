import { ActivityLogType, FileSaveType, Permission } from '@sharkord/shared';
import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db';
import { publishEmoji } from '../../db/publishers';
import { getUniqueEmojiName } from '../../db/queries/emojis';
import { emojis } from '../../db/schema';
import { fileManager } from '../../helpers/file-manager';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const MAX_EMOJIS_PER_CALL = 20;

const addEmojiRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.addEmoji.maxRequests,
  windowMs: config.rateLimiters.addEmoji.windowMs,
  logLabel: 'addEmoji'
})
  .input(
    z
      .array(
        z.object({
          fileId: z.string(),
          name: z.string().min(1).max(32)
        })
      )
      .min(1)
      .max(MAX_EMOJIS_PER_CALL)
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_EMOJIS);

    const prepared: { name: string; fileId: number }[] = [];

    for (const data of input) {
      const newFile = await fileManager.saveFile(
        data.fileId,
        ctx.userId,
        FileSaveType.EMOJI
      );

      prepared.push({
        name: await getUniqueEmojiName(data.name),
        fileId: newFile.id
      });
    }

    const createdEmojis = db.transaction((tx) =>
      tx
        .insert(emojis)
        .values(
          prepared.map(({ name, fileId }) => ({
            name,
            fileId,
            userId: ctx.userId,
            createdAt: Date.now()
          }))
        )
        .returning()
        .all()
    );

    for (const emoji of createdEmojis) {
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
