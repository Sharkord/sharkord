import type { TPluginMessageComponent } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { publishMessage } from '../../db/publishers';
import { messages } from '../../db/schema';
import { loadOwnPluginMessage } from './load-own-plugin-message';
import { parsePluginMessageComponents } from './plugin-message-components';

// not an edit of what the message says, so it leaves no "edited" mark
const setPluginMessageComponents = async (
  pluginId: string,
  messageId: number,
  components: TPluginMessageComponent[] | null
) => {
  const message = await loadOwnPluginMessage(pluginId, messageId, 'edit');

  const parsed =
    components === null ? null : parsePluginMessageComponents(components);

  await db
    .update(messages)
    .set({ pluginComponents: parsed, updatedAt: Date.now() })
    .where(eq(messages.id, messageId));

  publishMessage(messageId, message.channelId, 'update');
};

export { setPluginMessageComponents };
