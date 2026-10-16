import { getPlainTextFromHtml, isEmptyMessage } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { publishMessage } from '../../db/publishers';
import { messages } from '../../db/schema';
import { sanitizeMessageHtml } from '../../helpers/sanitize-html';
import { followThreadOnEdit } from '../../helpers/threads';
import { enqueueProcessMetadata } from '../../queues/message-metadata';
import { invariant } from '../../utils/invariant';
import { eventBus } from '../event-bus';
import { loadOwnPluginMessage } from './load-own-plugin-message';

type TEditPluginMessageOptions = {
  pluginId: string;
  messageId: number;
  content: string;
  previews?: boolean;
};

const editPluginMessage = async (
  options: TEditPluginMessageOptions
): Promise<void> => {
  const { pluginId, messageId, content, previews = true } = options;

  const message = await loadOwnPluginMessage(pluginId, messageId, 'edit');

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

  if (message.parentMessageId) {
    await followThreadOnEdit({
      id: messageId,
      parentMessageId: message.parentMessageId,
      channelId: message.channelId,
      userId: null,
      content: sanitizedContent
    });
  }

  publishMessage(messageId, message.channelId, 'update');
  if (previews) enqueueProcessMetadata(sanitizedContent, messageId);

  eventBus.emit('message:updated', {
    messageId,
    channelId: message.channelId,
    userId: null,
    editedBy: null,
    pluginId,
    content: sanitizedContent,
    textContent: getPlainTextFromHtml(sanitizedContent)
  });
};

export { editPluginMessage };
