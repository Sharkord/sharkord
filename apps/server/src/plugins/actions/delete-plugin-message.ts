import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { removeFile } from '../../db/mutations/files';
import { publishMessage, publishReplyCount } from '../../db/publishers';
import { getFilesByMessageId } from '../../db/queries/files';
import { messages } from '../../db/schema';
import { eventBus } from '../event-bus';
import { loadOwnPluginMessage } from './load-own-plugin-message';

type TDeletePluginMessageOptions = {
  pluginId: string;
  messageId: number;
};

const deletePluginMessage = async (
  options: TDeletePluginMessageOptions
): Promise<void> => {
  const { pluginId, messageId } = options;

  const message = await loadOwnPluginMessage(pluginId, messageId, 'delete');

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
