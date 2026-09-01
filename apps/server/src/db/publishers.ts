import {
  ChannelPermission,
  ServerEvents,
  type TChannelUserPermissionsMap
} from '@sharkord/shared';
import { count, eq } from 'drizzle-orm';
import { db } from '.';
import { getComponentAccessRules } from '../helpers/plugin-capability-access';
import { pubsub } from '../utils/pubsub';
import {
  channelUserCan,
  getAffectedOnlineUserIdsForChannel,
  getAllChannelUserPermissions,
  getChannelsForUser
} from './queries/channels';
import { getEmojiById } from './queries/emojis';
import { getMessage } from './queries/messages';
import { getRole } from './queries/roles';
import { getPublicSettings } from './queries/server';
import { getAllUserIds, getPublicUserById } from './queries/users';
import { categories, channels, messages } from './schema';

const publishMessage = async (
  messageId: number,
  channelId: number,
  type: 'create' | 'update' | 'delete'
) => {
  if (type === 'delete') {
    const affectedUserIds = await getAffectedOnlineUserIdsForChannel(
      channelId,
      ChannelPermission.VIEW_CHANNEL
    );

    pubsub.publishFor(affectedUserIds, ServerEvents.MESSAGE_DELETE, {
      messageId: messageId,
      channelId: channelId
    });

    return;
  }

  const message = await getMessage(messageId);

  if (!message) return;

  const targetEvent =
    type === 'create' ? ServerEvents.NEW_MESSAGE : ServerEvents.MESSAGE_UPDATE;

  const affectedUserIds = await getAffectedOnlineUserIdsForChannel(
    channelId,
    ChannelPermission.VIEW_CHANNEL
  );

  pubsub.publishFor(affectedUserIds, targetEvent, message);

  // thread replies should not increment the channel's unread count
  if (message.parentMessageId) return;

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
  type: 'create' | 'update'
) => {
  if (!userId) return;

  const user = await getPublicUserById(userId);

  if (!user) return;

  const targetEvent =
    type === 'create' ? ServerEvents.USER_CREATE : ServerEvents.USER_UPDATE;

  pubsub.publish(targetEvent, user);
};

const publishChannel = async (
  channelId: number | undefined,
  type: 'create' | 'update' | 'delete',
  ensureUsersAccess = false
) => {
  if (!channelId) return;

  if (type === 'delete') {
    const affectedUserIds = await getAllUserIds();

    pubsub.publishFor(affectedUserIds, ServerEvents.CHANNEL_DELETE, channelId);

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

  const affectedUserIds = await getAffectedOnlineUserIdsForChannel(
    channel.id,
    ChannelPermission.VIEW_CHANNEL
  );

  pubsub.publishFor(affectedUserIds, targetEvent, channel);

  if (ensureUsersAccess) {
    const allUserIds = await getAllUserIds();
    const affectedUserIdSet = new Set(affectedUserIds);

    // ensureUsersAccess is set to true when the private setting changed
    // was public -> private: we need to publish delete events to users who lost access
    // was private -> public: we need to publish create events to users who gained access

    if (type === 'update') {
      if (channel.private) {
        // channel is now private, so send delete events to users who lost access to it
        const lostAccessUserIds = allUserIds.filter(
          (id) => !affectedUserIdSet.has(id)
        );

        if (lostAccessUserIds.length > 0) {
          pubsub.publishFor(
            lostAccessUserIds,
            ServerEvents.CHANNEL_DELETE,
            channel.id
          );
        }
      } else {
        // channel is now public, so all users should have access to it
        // send a create event
        // if a user already has the channel in the state it will ignore the create event, so we don't need to worry about that
        pubsub.publishFor(allUserIds, ServerEvents.CHANNEL_CREATE, channel);
      }
    }
  }
};

const publishHiddenChannelToUser = async (
  userId: number,
  channelId: number
) => {
  const canView = await channelUserCan(
    channelId,
    userId,
    ChannelPermission.VIEW_CHANNEL
  );

  if (canView) return;

  const channel = await db
    .select()
    .from(channels)
    .where(eq(channels.id, channelId))
    .get();

  if (!channel) return;

  pubsub.publishFor(userId, ServerEvents.CHANNEL_CREATE, channel);
};

const unpublishHiddenChannelFromUser = async (
  userId: number,
  channelId: number
) => {
  const canView = await channelUserCan(
    channelId,
    userId,
    ChannelPermission.VIEW_CHANNEL
  );

  if (canView) return;

  pubsub.publishFor(userId, ServerEvents.CHANNEL_DELETE, channelId);
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

const publishChannelAccessChange = async (
  channelId: number,
  audienceBefore: number[]
) => {
  const audienceAfter = await getAffectedOnlineUserIdsForChannel(
    channelId,
    ChannelPermission.VIEW_CHANNEL
  );

  const beforeSet = new Set(audienceBefore);
  const afterSet = new Set(audienceAfter);

  const gained = audienceAfter.filter((userId) => !beforeSet.has(userId));
  const lost = audienceBefore.filter((userId) => !afterSet.has(userId));

  if (gained.length > 0) {
    const channel = await db
      .select()
      .from(channels)
      .where(eq(channels.id, channelId))
      .get();

    if (channel) {
      pubsub.publishFor(gained, ServerEvents.CHANNEL_CREATE, channel);
    }
  }

  if (lost.length > 0) {
    pubsub.publishFor(lost, ServerEvents.CHANNEL_DELETE, channelId);
  }

  await publishChannelPermissions([
    ...new Set([...audienceBefore, ...audienceAfter])
  ]);
};

const publishChannelListChange = async (
  userId: number,
  channelIdsBefore: number[]
) => {
  const channelsAfter = await getChannelsForUser(userId);

  const beforeSet = new Set(channelIdsBefore);
  const afterSet = new Set(channelsAfter.map((channel) => channel.id));

  channelsAfter
    .filter((channel) => !beforeSet.has(channel.id))
    .forEach((channel) =>
      pubsub.publishFor(userId, ServerEvents.CHANNEL_CREATE, channel)
    );

  channelIdsBefore
    .filter((channelId) => !afterSet.has(channelId))
    .forEach((channelId) =>
      pubsub.publishFor(userId, ServerEvents.CHANNEL_DELETE, channelId)
    );

  await publishChannelPermissions([userId]);
};

const publishComponentAccess = async () => {
  pubsub.publish(
    ServerEvents.PLUGIN_COMPONENT_ACCESS_CHANGE,
    await getComponentAccessRules()
  );
};

const publishReplyCount = async (
  parentMessageId: number,
  channelId: number
) => {
  const replyCountRow = await db
    .select({ count: count() })
    .from(messages)
    .where(eq(messages.parentMessageId, parentMessageId))
    .get();

  const affectedUserIds = await getAffectedOnlineUserIdsForChannel(
    channelId,
    ChannelPermission.VIEW_CHANNEL
  );

  pubsub.publishFor(affectedUserIds, ServerEvents.THREAD_REPLY_COUNT_UPDATE, {
    messageId: parentMessageId,
    channelId,
    replyCount: replyCountRow?.count ?? 0
  });
};

export {
  publishCategory,
  publishChannel,
  publishChannelAccessChange,
  publishChannelListChange,
  publishChannelPermissions,
  publishComponentAccess,
  publishEmoji,
  publishHiddenChannelToUser,
  publishMessage,
  publishReplyCount,
  publishRole,
  publishSettings,
  publishUser,
  unpublishHiddenChannelFromUser
};
