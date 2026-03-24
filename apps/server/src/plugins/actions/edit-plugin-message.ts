import { isEmptyMessage } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { pluginManager } from '..';
import { db } from '../../db';
import { publishMessage } from '../../db/publishers';
import { messages } from '../../db/schema';
import { sanitizeMessageHtml } from '../../helpers/sanitize-html';
import { enqueueProcessMetadata } from '../../queues/message-metadata';
import { invariant } from '../../utils/invariant';
import { eventBus } from '../event-bus';

type TEditPluginMessageOptions = {
  pluginId: string;
  messageId: number;
  content: string;
};

const editPluginMessage = async (
  options: TEditPluginMessageOptions
): Promise<void> => {
  const { pluginId, messageId, content } = options;

  invariant(pluginManager.isEnabled(pluginId), {
    code: 'FORBIDDEN',
    message: 'Plugin is not enabled.'
  });

  const message = await db
    .select({
      pluginId: messages.pluginId,
      channelId: messages.channelId
    })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1)
    .get();

  invariant(message, {
    code: 'NOT_FOUND',
    message: 'Message not found'
  });

  invariant(message.pluginId === pluginId, {
    code: 'FORBIDDEN',
    message: 'You do not have permission to edit this message'
  });

  const sanitizedContent = sanitizeMessageHtml(content);

  invariant(!isEmptyMessage(sanitizedContent), {
    code: 'BAD_REQUEST',
    message: 'Plugin message content cannot be empty.'
  });

  await db
    .update(messages)
    .set({
      content: sanitizedContent,
      updatedAt: Date.now(),
      editedAt: Date.now(),
      editedBy: null
    })
    .where(eq(messages.id, messageId));

  publishMessage(messageId, message.channelId, 'update');
  enqueueProcessMetadata(sanitizedContent, messageId);

  eventBus.emit('message:updated', {
    messageId,
    channelId: message.channelId,
    userId: null,
    pluginId,
    content: sanitizedContent
  });
};

export { editPluginMessage };
