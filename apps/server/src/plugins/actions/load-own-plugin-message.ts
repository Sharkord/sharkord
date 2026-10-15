import { eq } from 'drizzle-orm';
import { pluginManager } from '..';
import { db } from '../../db';
import { messages } from '../../db/schema';
import { invariant } from '../../utils/invariant';

const loadOwnPluginMessage = async (
  pluginId: string,
  messageId: number,
  action: 'edit' | 'delete'
) => {
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
    message: `You do not have permission to ${action} this message`
  });

  return message;
};

export { loadOwnPluginMessage };
