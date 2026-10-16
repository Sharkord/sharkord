import {
  getPlainTextFromHtml,
  isEmptyMessage,
  MESSAGE_MAX_LENGTH,
  MessageSaveType
} from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db';
import { publishMessage } from '../../db/publishers';
import { getSettings } from '../../db/queries/server';
import { messages } from '../../db/schema';
import {
  assertCanModifyMessage,
  loadMessageForWrite
} from '../../helpers/load-message-for-write';
import { runBeforeMessageSaveHooks } from '../../helpers/run-before-message-save-hooks';
import { sanitizeMessageHtml } from '../../helpers/sanitize-html';
import { eventBus } from '../../plugins/event-bus';
import { enqueueProcessMetadata } from '../../queues/message-metadata';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const editMessageRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.sendAndEditMessage.maxRequests,
  windowMs: config.rateLimiters.sendAndEditMessage.windowMs,
  logLabel: 'editMessage'
})
  .input(
    z.object({
      messageId: z.number(),
      content: z.string().max(MESSAGE_MAX_LENGTH)
    })
  )
  .mutation(async ({ input, ctx }) => {
    const message = await loadMessageForWrite(ctx, input.messageId);

    invariant(message.editable, {
      code: 'FORBIDDEN',
      message: 'This message is not editable'
    });

    await assertCanModifyMessage(ctx, message, 'edit this message');

    invariant(!isEmptyMessage(input.content), {
      code: 'BAD_REQUEST',
      message: 'Message cannot be empty.'
    });

    let sanitizedContent = sanitizeMessageHtml(input.content);

    invariant(!isEmptyMessage(sanitizedContent), {
      code: 'BAD_REQUEST',
      message:
        'Your message only contained unsupported or removed content, so there was nothing to send.'
    });

    const { enablePlugins } = await getSettings();

    if (enablePlugins) {
      sanitizedContent = await runBeforeMessageSaveHooks({
        content: sanitizedContent,
        channelId: message.channelId,
        userId: ctx.userId,
        type: MessageSaveType.EDIT,
        messageId: input.messageId
      });
    }

    const editedAt = Date.now();

    await db
      .update(messages)
      .set({
        content: sanitizedContent,
        updatedAt: editedAt,
        editedAt,
        editedBy: ctx.user.id
      })
      .where(eq(messages.id, input.messageId));

    publishMessage(input.messageId, message.channelId, 'update');
    enqueueProcessMetadata(sanitizedContent, input.messageId);

    eventBus.emit('message:updated', {
      messageId: input.messageId,
      channelId: message.channelId,
      userId: message.userId,
      editedBy: ctx.user.id,
      pluginId: message.pluginId,
      content: sanitizedContent,
      textContent: getPlainTextFromHtml(sanitizedContent)
    });
  });

export { editMessageRoute };
