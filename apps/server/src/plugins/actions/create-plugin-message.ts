import { getPlainTextFromHtml, isEmptyMessage } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { pluginManager } from '..';
import { db } from '../../db';
import { publishMessage, publishReplyCount } from '../../db/publishers';
import { getSettings } from '../../db/queries/server';
import { channels, messageFiles, messages } from '../../db/schema';
import { fileManager } from '../../helpers/file-manager';
import { sanitizeMessageHtml } from '../../helpers/sanitize-html';
import { enqueueProcessMetadata } from '../../queues/message-metadata';
import { invariant } from '../../utils/invariant';
import { eventBus } from '../event-bus';

type TPluginMessageFile = {
  name: string;
  data: Uint8Array;
};

type TCreatePluginMessageOptions = {
  pluginId: string;
  channelId: number;
  content: string;
  parentMessageId?: number;
  replyToMessageId?: number;
  files?: TPluginMessageFile[];
  previews?: boolean;
};

const createPluginMessage = async (
  options: TCreatePluginMessageOptions
): Promise<{ messageId: number }> => {
  const {
    pluginId,
    channelId,
    content,
    parentMessageId,
    replyToMessageId,
    files = [],
    previews = true
  } = options;

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

  const settings = await getSettings();

  invariant(files.length <= Math.max(0, settings.storageMaxFilesPerMessage), {
    code: 'BAD_REQUEST',
    message: `At most ${settings.storageMaxFilesPerMessage} file(s) can be attached per message.`
  });

  const sanitizedContent = sanitizeMessageHtml(content);

  invariant(!isEmptyMessage(sanitizedContent) || files.length > 0, {
    code: 'BAD_REQUEST',
    message: 'Plugin message content cannot be empty.'
  });

  const fileIds: number[] = [];

  for (const file of files) {
    const saved = await fileManager.savePluginFile(
      pluginId,
      file.name,
      file.data
    );

    fileIds.push(saved.id);
  }

  const message = db.transaction((tx) => {
    const created = tx
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

    if (fileIds.length > 0) {
      tx.insert(messageFiles)
        .values(
          fileIds.map((fileId) => ({
            messageId: created.id,
            fileId,
            createdAt: Date.now()
          }))
        )
        .run();
    }

    return created;
  });

  publishMessage(message.id, channelId, 'create');

  if (parentMessageId) {
    publishReplyCount(parentMessageId, channelId);
  }

  if (previews) enqueueProcessMetadata(sanitizedContent, message.id);

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
export type { TPluginMessageFile };
