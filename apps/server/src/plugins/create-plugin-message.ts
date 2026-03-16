import { isEmptyMessage } from '@sharkord/shared';
import { db } from '../db';
import { publishMessage } from '../db/publishers';
import { messages } from '../db/schema';
import { sanitizeMessageHtml } from '../helpers/sanitize-html';
import { enqueueProcessMetadata } from '../queues/message-metadata';
import { eventBus } from './event-bus';

type TCreatePluginMessageOptions = {
  pluginId: string;
  channelId: number;
  content: string;
};

const createPluginMessage = async (
  options: TCreatePluginMessageOptions
): Promise<{ messageId: number }> => {
  const { pluginId, channelId, content } = options;

  const sanitizedContent = sanitizeMessageHtml(content);

  if (isEmptyMessage(sanitizedContent)) {
    throw new Error('Plugin message content cannot be empty.');
  }

  const message = await db
    .insert(messages)
    .values({
      channelId,
      userId: null,
      pluginId,
      content: sanitizedContent,
      editable: false,
      parentMessageId: null,
      createdAt: Date.now()
    })
    .returning()
    .get();

  publishMessage(message.id, channelId, 'create');

  enqueueProcessMetadata(sanitizedContent, message.id);

  eventBus.emit('message:created', {
    messageId: message.id,
    channelId,
    userId: null,
    pluginId,
    content: sanitizedContent
  });

  return { messageId: message.id };
};

export { createPluginMessage };
