import {
  ChannelPermission,
  ServerEvents,
  type TChannelUserPermissionsMap
} from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { db } from '.';
import { pluginManager } from '../plugins';
import { pubsub } from '../utils/pubsub';
import {
  getAffectedUserIdsForChannel,
  getAllChannelUserPermissions
} from './queries/channels';
import { getEmojiById } from './queries/emojis';
import { getMessage } from './queries/messages';
import { getRole } from './queries/roles';
import { getPublicSettings } from './queries/server';
import { getPublicUserById } from './queries/users';
import { categories, channels } from './schema';

const publishMessage = async (
  messageId: number | undefined,
  channelId: number | undefined,
  type: 'create' | 'update' | 'delete'
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

  const targetEvent =
    type === 'create' ? ServerEvents.NEW_MESSAGE : ServerEvents.MESSAGE_UPDATE;

  const affectedUserIds = await getAffectedUserIdsForChannel(channelId, {
    permission: ChannelPermission.VIEW_CHANNEL
  });

  pubsub.publishFor(affectedUserIds, targetEvent, message);

  // only send unread updates to users OTHER than the message author
  const usersToNotify = affectedUserIds.filter((id) => id !== message.userId);

  if (usersToNotify.length > 0) {
    pubsub.publishFor(usersToNotify, ServerEvents.CHANNEL_READ_STATES_DELTA, {
      channelId,
      // this was sending the whole unread count before which was causing performance issues, now it just sends a delta of 1 which the client can use to update the unread count
      // this isn't perfectly accurate in some cases but it should be good enough for most cases and it significantly reduces the amount of work the db has to
      delta: 1
    });
  }
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
  const settings = await getPublicSettings();

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

const publishChannelPermissions = async (affectedUserIds: number[]) => {
  const permissionsMap = new Map<number, TChannelUserPermissionsMap>();
  const promises = affectedUserIds.map(async (userId) => {
    const updatedPermissions = await getAllChannelUserPermissions(userId);

    permissionsMap.set(userId, updatedPermissions);
  });

  await Promise.all(promises);

  for (const userId of affectedUserIds) {
    const updatedPermissions = permissionsMap.get(userId);

    if (!updatedPermissions) continue;

    pubsub.publishFor(
      userId,
      ServerEvents.CHANNEL_PERMISSIONS_UPDATE,
      updatedPermissions
    );
  }
};

const publishPluginCommands = async () => {
  const commands = pluginManager.getCommands();

  pubsub.publish(ServerEvents.PLUGIN_COMMANDS_CHANGE, commands);
};

export {
  publishCategory,
  publishChannel,
  publishChannelPermissions,
  publishEmoji,
  publishMessage,
  publishPluginCommands,
  publishRole,
  publishSettings,
  publishUser
};
