import { ActivityLogType, Permission } from '@sharkord/shared';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { updateEmoji } from '../../db/mutations/emojis/update-emoji';
import { publishEmoji } from '../../db/publishers';
import { emojiExists } from '../../db/queries/emojis/emoji-exists';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const updateEmojiRoute = protectedProcedure
  .input(
    z.object({
      emojiId: z.number().min(1),
      name: z.string().min(1).max(24)
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_EMOJIS);

    const exists = await emojiExists(input.name);

    if (exists) {
      ctx.throwValidationError(
        'name',
        'An emoji with this name already exists.'
      );
    }

    const updatedEmoji = await updateEmoji(input.emojiId, {
      name: input.name
    });

    if (!updatedEmoji) {
      throw new TRPCError({
        code: 'NOT_FOUND'
      });
    }

    publishEmoji(updatedEmoji.id, 'update');
    enqueueActivityLog({
      type: ActivityLogType.UPDATED_EMOJI,
      userId: ctx.user.id,
      details: {
        name: updatedEmoji.name
      }
    });
  });

export { updateEmojiRoute };
