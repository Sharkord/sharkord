import { FileSaveType, Permission } from '@sharkord/shared';
import { z } from 'zod';
import { config } from '../../config';
import { getUniqueEmojiName } from '../../db/queries/emojis';
import { insertEmojis } from '../../helpers/emojis';
import { fileManager } from '../../helpers/file-manager';
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

    insertEmojis(prepared, ctx.userId, ctx.user.id);
  });

export { addEmojiRoute };
