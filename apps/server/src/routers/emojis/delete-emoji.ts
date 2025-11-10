import { ActivityLogType, Permission } from '@sharkord/shared';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { removeEmoji } from '../../db/mutations/emojis/remove-emoji';
import { removeFile } from '../../db/mutations/files/remove-file';
import { publishEmoji } from '../../db/publishers';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const deleteEmojiRoute = protectedProcedure
  .input(
    z.object({
      emojiId: z.number()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_EMOJIS);

    const removedEmoji = await removeEmoji(input.emojiId);

    if (!removedEmoji) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    await removeFile(removedEmoji.fileId);

    publishEmoji(removedEmoji.id, 'delete');
    enqueueActivityLog({
      type: ActivityLogType.DELETED_EMOJI,
      userId: ctx.user.id,
      details: {
        name: removedEmoji.name
      }
    });
  });

export { deleteEmojiRoute };
