import { Permission, isEmptyMessage } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishMessage, publishExternalMessage } from '../../db/publishers';
import { messages } from '../../db/schema';
import { sanitizeMessageHtml } from '../../helpers/sanitize-html';
import { eventBus } from '../../plugins/event-bus';
import { enqueueProcessMetadata } from '../../queues/message-metadata';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const editMessageRoute = protectedProcedure
  .input(
    z.object({
      messageId: z.number(),
      content: z.string()
    })
  )
  .mutation(async ({ input, ctx }) => {
    const message = await db
      .select({
        userId: messages.userId,
        channelId: messages.channelId,
        externalChannelId: messages.externalChannelId,
        editable: messages.editable
      })
      .from(messages)
      .where(eq(messages.id, input.messageId))
      .limit(1)
      .get();

    invariant(message, {
      code: 'NOT_FOUND',
      message: 'Message not found'
    });

    invariant(message.editable, {
      code: 'FORBIDDEN',
      message: 'This message is not editable'
    });

    invariant(
      message.userId === ctx.user.id ||
        ((await ctx.hasPermission(Permission.MANAGE_MESSAGES) && !message.externalChannelId)),
      {
        code: 'FORBIDDEN',
        message: 'You do not have permission to edit this message'
      }
    );

    invariant(!isEmptyMessage(input.content), {
      code: 'BAD_REQUEST',
      message: 'Message cannot be empty.'
    });

    const sanitizedContent = sanitizeMessageHtml(input.content);

    invariant(!isEmptyMessage(input.content), {
      code: 'BAD_REQUEST',
      message: 'Your message only contained unsupported or removed content, so there was nothing to send.'
    });

    await db
      .update(messages)
      .set({
        content: sanitizedContent,
        updatedAt: Date.now()
      })
      .where(eq(messages.id, input.messageId));

      if( message.externalChannelId ) {
        publishExternalMessage(input.messageId, message.externalChannelId, 'update');
      }
      else {
        publishMessage(input.messageId, message.channelId, 'update');
      }
    
    enqueueProcessMetadata(sanitizedContent, input.messageId);

    eventBus.emit('message:updated', {
      messageId: input.messageId,
      channelId: message.channelId,
      externalChannelId: message.externalChannelId,
      userId: message.userId,
      content: sanitizedContent
    });
  });

export { editMessageRoute };
 