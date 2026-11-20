import { eq } from 'drizzle-orm';
import { pluginManager } from '..';
import { db } from '../../db';
import { deleteMessage } from '../../db/mutations/messages';
import { messages } from '../../db/schema';
import { invariant } from '../../utils/invariant';

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

  await deleteMessage({ id: messageId, ...message });
};

export { deletePluginMessage };
