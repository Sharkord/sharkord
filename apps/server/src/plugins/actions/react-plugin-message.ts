import { and, eq } from 'drizzle-orm';
import { db } from '../../db';
import { publishMessage } from '../../db/publishers';
import { getEmojiFileIdByEmojiName } from '../../db/queries/emojis';
import { messageReactions } from '../../db/schema';
import { loadMessage } from '../../helpers/load-message-for-write';
import { eventBus } from '../event-bus';

const pluginReactionWhere = (
  messageId: number,
  pluginId: string,
  emoji: string
) =>
  and(
    eq(messageReactions.messageId, messageId),
    eq(messageReactions.pluginId, pluginId),
    eq(messageReactions.emoji, emoji)
  );

const addPluginReaction = async (
  pluginId: string,
  messageId: number,
  emoji: string
) => {
  const message = await loadMessage(messageId);

  const existing = await db
    .select({ emoji: messageReactions.emoji })
    .from(messageReactions)
    .where(pluginReactionWhere(messageId, pluginId, emoji))
    .limit(1)
    .get();

  if (existing) return;

  const emojiFileId = await getEmojiFileIdByEmojiName(emoji);

  await db.insert(messageReactions).values({
    messageId,
    userId: null,
    pluginId,
    emoji,
    fileId: emojiFileId,
    createdAt: Date.now()
  });

  publishMessage(messageId, message.channelId, 'update');

  eventBus.emit('reaction:added', {
    messageId,
    channelId: message.channelId,
    pluginId,
    emoji
  });
};

const removePluginReaction = async (
  pluginId: string,
  messageId: number,
  emoji: string
) => {
  const message = await loadMessage(messageId);

  const removed = await db
    .delete(messageReactions)
    .where(pluginReactionWhere(messageId, pluginId, emoji))
    .returning()
    .get();

  if (!removed) return;

  publishMessage(messageId, message.channelId, 'update');

  eventBus.emit('reaction:removed', {
    messageId,
    channelId: message.channelId,
    pluginId,
    emoji
  });
};

export { addPluginReaction, removePluginReaction };
