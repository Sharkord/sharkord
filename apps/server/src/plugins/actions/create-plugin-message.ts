import { isEmptyMessage } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { pluginManager } from '..';
import { db } from '../../db';
import { publishMessage } from '../../db/publishers';
import { channels, messages } from '../../db/schema';
import { sanitizeMessageHtml } from '../../helpers/sanitize-html';
import { enqueueProcessMetadata } from '../../queues/message-metadata';
import { invariant } from '../../utils/invariant';
import { eventBus } from '../event-bus';

type TCreatePluginMessageOptions = {
  pluginId: string;
  channelId: number;
  content: string;
};

const createPluginMessage = async (
  options: TCreatePluginMessageOptions
): Promise<{ messageId: number }> => {
  const { pluginId, channelId, content } = options;

  invariant(pluginManager.isEnabled(pluginId), {
    code: 'FORBIDDEN',
    message: 'Plugin is not enabled.'
  });

  const channel = await db
    .select()
    .from(channels)
    .where(eq(channels.id, channelId))
    .get();

  invariant(channel, {
    code: 'NOT_FOUND',
    message: 'Channel not found'
  });

  const sanitizedContent = sanitizeMessageHtml(content);

  invariant(!isEmptyMessage(sanitizedContent), {
    code: 'BAD_REQUEST',
    message: 'Plugin message content cannot be empty.'
  });

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
