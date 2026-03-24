import { eq } from 'drizzle-orm';
import { pluginManager } from '..';
import { db } from '../../db';
import { removeFile } from '../../db/mutations/files';
import { publishMessage, publishReplyCount } from '../../db/publishers';
import { getFilesByMessageId } from '../../db/queries/files';
import { messages } from '../../db/schema';
import { invariant } from '../../utils/invariant';
import { eventBus } from '../event-bus';

type TDeletePluginMessageOptions = {
  pluginId: string;
  messageId: number;
};

const deletePluginMessage = async (
  options: TDeletePluginMessageOptions
): Promise<void> => {
  const { pluginId, messageId } = options;

  invariant(pluginManager.isEnabled(pluginId), {
    code: 'FORBIDDEN',
    message: 'Plugin is not enabled.'
  });

  const message = await db
    .select({
      pluginId: messages.pluginId,
      channelId: messages.channelId,
      parentMessageId: messages.parentMessageId
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
    message: 'You do not have permission to delete this message'
  });

  const files = await getFilesByMessageId(messageId);

  if (files.length > 0) {
    const promises = files.map(async (file) => {
      await removeFile(file.id);
    });

    await Promise.all(promises);
  }

  await db.delete(messages).where(eq(messages.id, messageId));

  publishMessage(messageId, message.channelId, 'delete');

  if (message.parentMessageId) {
    publishReplyCount(message.parentMessageId, message.channelId);
  }

  eventBus.emit('message:deleted', {
    channelId: message.channelId,
    messageId
  });
};

export { deletePluginMessage };
