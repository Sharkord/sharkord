import { getPlainTextFromHtml, isEmptyMessage } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { pluginManager } from '..';
import { db } from '../../db';
import { publishMessage, publishReplyCount } from '../../db/publishers';
import { channels, messages } from '../../db/schema';
import { sanitizeMessageHtml } from '../../helpers/sanitize-html';
import { enqueueProcessMetadata } from '../../queues/message-metadata';
import { invariant } from '../../utils/invariant';
import { eventBus } from '../event-bus';

type TCreatePluginMessageOptions = {
  pluginId: string;
  channelId: number;
  content: string;
  parentMessageId?: number;
  replyToMessageId?: number;
};

const createPluginMessage = async (
  options: TCreatePluginMessageOptions
): Promise<{ messageId: number }> => {
  const { pluginId, channelId, content, parentMessageId, replyToMessageId } =
    options;

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

  if (parentMessageId) {
    const parentMessage = await db
      .select({
        id: messages.id,
        channelId: messages.channelId,
        parentMessageId: messages.parentMessageId
      })
      .from(messages)
      .where(eq(messages.id, parentMessageId))
      .limit(1)
      .get();

    invariant(parentMessage, {
      code: 'NOT_FOUND',
      message: 'Parent message not found.'
    });

    invariant(parentMessage.channelId === channelId, {
      code: 'BAD_REQUEST',
      message: 'Parent message must be in the same channel.'
    });

    invariant(!parentMessage.parentMessageId, {
      code: 'BAD_REQUEST',
      message:
        'Cannot reply to a thread reply. Threads are only one level deep.'
    });
  }

  if (replyToMessageId) {
    const repliedMessage = await db
      .select({
        id: messages.id,
        channelId: messages.channelId
      })
      .from(messages)
      .where(eq(messages.id, replyToMessageId))
      .limit(1)
      .get();

    invariant(repliedMessage, {
      code: 'NOT_FOUND',
      message: 'Reply target message not found.'
    });

    invariant(repliedMessage.channelId === channelId, {
      code: 'BAD_REQUEST',
      message: 'Reply target message must be in the same channel.'
    });
  }

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
      parentMessageId: parentMessageId ?? null,
      replyToMessageId: replyToMessageId ?? null,
      createdAt: Date.now()
    })
    .returning()
    .get();

  publishMessage(message.id, channelId, 'create');

  if (parentMessageId) {
    publishReplyCount(parentMessageId, channelId);
  }

  enqueueProcessMetadata(sanitizedContent, message.id);

  eventBus.emit('message:created', {
    messageId: message.id,
    channelId,
    userId: null,
    pluginId,
    content: sanitizedContent,
    textContent: getPlainTextFromHtml(sanitizedContent)
  });

  return { messageId: message.id };
};

export { createPluginMessage };
