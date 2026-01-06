import { ActivityLogType, Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { removeFile } from '../../db/mutations/files';
import { publishEmoji } from '../../db/publishers';
import { emojis } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const deleteEmojiRoute = protectedProcedure
  .input(
    z.object({
      emojiId: z.number()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_EMOJIS);

    const removedEmoji = await db
      .delete(emojis)
      .where(eq(emojis.id, input.emojiId))
      .returning()
      .get();

    invariant(removedEmoji, {
      code: 'NOT_FOUND',
      message: 'Emoji not found'
    });

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
