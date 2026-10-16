import { eq } from 'drizzle-orm';
import { db } from '..';
import { eventBus } from '../../plugins/event-bus';
import {
  publishMessageDelete,
  publishReplyCount,
  publishThreadFollowers
} from '../publishers';
import { getFilesByMessageId } from '../queries/files';
import { messages } from '../schema';
import { removeFile } from './files';

type TDeletableMessage = {
  id: number;
  channelId: number;
  parentMessageId: number | null;
};

const deleteMessage = async (message: TDeletableMessage) => {
  const attachedFiles = await getFilesByMessageId(message.id);

  await db.delete(messages).where(eq(messages.id, message.id));

  await Promise.all(attachedFiles.map((file) => removeFile(file.id)));

  publishMessageDelete(message);

  if (message.parentMessageId) {
    publishReplyCount(message.parentMessageId, message.channelId);
    // a deleted reply may have been unread, so the counts are recomputed
    publishThreadFollowers(message.parentMessageId, message.channelId);
  }

  eventBus.emit('message:deleted', {
    channelId: message.channelId,
    messageId: message.id
  });
};

export { deleteMessage };
