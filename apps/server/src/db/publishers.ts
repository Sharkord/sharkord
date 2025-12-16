import { ServerEvents } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { db } from '.';
import { pubsub } from '../utils/pubsub';
import { getEmojiById } from './queries/emojis/get-emoji-by-id';
import { getMessage } from './queries/messages/get-message';
import { getPublicUserById } from './queries/users/get-public-user-by-id';
import { getRole } from './queriesv2/roles';
import { getSettings } from './queriesv2/server';
import { categories, channels } from './schema';

const publishMessage = async (
  messageId: number | undefined,
  channelId: number | undefined,
  type: 'update' | 'delete'
) => {
  if (!messageId || !channelId) return;

  if (type === 'delete') {
    pubsub.publish(ServerEvents.MESSAGE_DELETE, {
      messageId: messageId,
      channelId: channelId
    });

    return;
  }

  const message = await getMessage(messageId);

  if (!message) return;

  pubsub.publish(ServerEvents.MESSAGE_UPDATE, message);
};

const publishEmoji = async (
  emojiId: number | undefined,
  type: 'create' | 'update' | 'delete'
) => {
  if (!emojiId) return;

  if (type === 'delete') {
    pubsub.publish(ServerEvents.EMOJI_DELETE, emojiId);
    return;
  }

  const emoji = await getEmojiById(emojiId);

  if (!emoji) return;

  const targetEvent =
    type === 'create' ? ServerEvents.EMOJI_CREATE : ServerEvents.EMOJI_UPDATE;

  pubsub.publish(targetEvent, emoji);
};

const publishRole = async (
  roleId: number | undefined,
  type: 'create' | 'update' | 'delete'
) => {
  if (!roleId) return;

  if (type === 'delete') {
    pubsub.publish(ServerEvents.ROLE_DELETE, roleId);
    return;
  }

  const role = await getRole(roleId);

  if (!role) return;

  const targetEvent =
    type === 'create' ? ServerEvents.ROLE_CREATE : ServerEvents.ROLE_UPDATE;

  pubsub.publish(targetEvent, role);
};

const publishUser = async (
  userId: number | undefined,
  type: 'create' | 'update' | 'delete'
) => {
  if (!userId) return;

  if (type === 'delete') {
    pubsub.publish(ServerEvents.USER_DELETE, userId);
    return;
  }

  const user = await getPublicUserById(userId);

  if (!user) return;

  const targetEvent =
    type === 'create' ? ServerEvents.USER_CREATE : ServerEvents.USER_UPDATE;

  pubsub.publish(targetEvent, user);
};

const publishChannel = async (
  channelId: number | undefined,
  type: 'create' | 'update' | 'delete'
) => {
  if (!channelId) return;

  if (type === 'delete') {
    pubsub.publish(ServerEvents.CHANNEL_DELETE, channelId);
    return;
  }

  const channel = await db
    .select()
    .from(channels)
    .where(eq(channels.id, channelId))
    .get();

  if (!channel) return;

  const targetEvent =
    type === 'create'
      ? ServerEvents.CHANNEL_CREATE
      : ServerEvents.CHANNEL_UPDATE;

  pubsub.publish(targetEvent, channel);
};

const publishSettings = async () => {
  const settings = await getSettings();

  pubsub.publish(ServerEvents.SERVER_SETTINGS_UPDATE, settings);
};

const publishCategory = async (
  categoryId: number | undefined,
  type: 'create' | 'update' | 'delete'
) => {
  if (!categoryId) return;

  if (type === 'delete') {
    pubsub.publish(ServerEvents.CATEGORY_DELETE, categoryId);
    return;
  }

  const category = await db
    .select()
    .from(categories)
    .where(eq(categories.id, categoryId))
    .get();

  if (!category) return;

  const targetEvent =
    type === 'create'
      ? ServerEvents.CATEGORY_CREATE
      : ServerEvents.CATEGORY_UPDATE;

  pubsub.publish(targetEvent, category);
};

export {
  publishCategory,
  publishChannel,
  publishEmoji,
  publishMessage,
  publishRole,
  publishSettings,
  publishUser
};
