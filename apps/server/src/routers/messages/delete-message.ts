import { Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { removeFile } from '../../db/mutations/files';
import { publishMessage, publishReplyCount } from '../../db/publishers';
import { assertDmChannel } from '../../db/queries/dms';
import { getFilesByMessageId } from '../../db/queries/files';
import { messages } from '../../db/schema';
import { eventBus } from '../../plugins/event-bus';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const deleteMessageRoute = protectedProcedure
  .input(z.object({ messageId: z.number() }))
  .mutation(async ({ input, ctx }) => {
    const targetMessage = await db
      .select({
        userId: messages.userId,
        channelId: messages.channelId,
        parentMessageId: messages.parentMessageId
      })
      .from(messages)
      .where(eq(messages.id, input.messageId))
      .limit(1)
      .get();

    invariant(targetMessage, {
      code: 'NOT_FOUND',
      message: 'Message not found'
    });

    await assertDmChannel(targetMessage.channelId, ctx.userId);

    invariant(
      targetMessage.userId === ctx.user.id ||
        (await ctx.hasPermission(Permission.MANAGE_MESSAGES)),
      {
        code: 'FORBIDDEN',
        message: 'You do not have permission to delete this message'
      }
    );

    const files = await getFilesByMessageId(input.messageId);

    if (files.length > 0) {
      const promises = files.map(async (file) => {
        await removeFile(file.id);
      });

      await Promise.all(promises);
    }

    // get messages that reference this one as an inline reply before deleting
    const affectedReplies = await db
      .select({ id: messages.id })
      .from(messages)
      .where(eq(messages.replyToMessageId, input.messageId));

    await db.delete(messages).where(eq(messages.id, input.messageId));

    // remove the stale reply references now that the target is gone
    if (affectedReplies.length > 0) {
      await db
        .update(messages)
        .set({ replyToMessageId: null })
        .where(eq(messages.replyToMessageId, input.messageId));

      await Promise.all(
        affectedReplies.map(({ id }) =>
          publishMessage(id, targetMessage.channelId, 'update')
        )
      );
    }

    publishMessage(input.messageId, targetMessage.channelId, 'delete');

    if (targetMessage.parentMessageId) {
      publishReplyCount(targetMessage.parentMessageId, targetMessage.channelId);
    }

    eventBus.emit('message:deleted', {
      channelId: targetMessage.channelId,
      messageId: input.messageId
    });
  });

export { deleteMessageRoute };
