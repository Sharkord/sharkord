import { eq } from 'drizzle-orm';
import { db } from '..';
import { refreshThreadFollowers } from '../../helpers/threads';
import { eventBus } from '../../plugins/event-bus';
import { publishMessageDelete, publishReplyCount } from '../publishers';
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
    // a deleted reply may have been unread, or the mention that made a badge red
    await refreshThreadFollowers(message.parentMessageId, message.channelId);
  }

  eventBus.emit('message:deleted', {
    channelId: message.channelId,
    messageId: message.id
  });
};

export { deleteMessage };
