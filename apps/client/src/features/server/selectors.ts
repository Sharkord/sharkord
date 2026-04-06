import { createSelector } from '@reduxjs/toolkit';
import { ChannelPermission, OWNER_ROLE_ID } from '@sharkord/shared';
import { createCachedSelector } from 're-reselect';
import type { IRootState } from '../store';
import {
  channelByIdSelector,
  channelPermissionsSelector,
  channelReadStateByIdSelector,
  channelsByCategoryIdSelector,
  channelsReadStatesSelector,
  currentVoiceChannelIdSelector
} from './channels/selectors';
import { canViewChannel, hasUnreadMentionInMessages } from './helpers';
import {
  messagesByChannelIdSelector,
  messagesMapSelector,
  threadTypingMapSelector,
  typingMapSelector
} from './messages/selectors';
import { rolesSelector } from './roles/selectors';
import type { TVoiceUser } from './types';
import {
  ownUserIdSelector,
  ownUserSelector,
  userByIdSelector,
  usersSelector
} from './users/selectors';
import { voiceChannelStateSelector } from './voice/selectors';

export const connectedSelector = (state: IRootState) => state.server.connected;

export const disconnectInfoSelector = (state: IRootState) =>
  state.server.disconnectInfo;

export const connectingSelector = (state: IRootState) =>
  state.server.connecting;

export const serverNameSelector = (state: IRootState) =>
  state.server.publicSettings?.name;

export const serverIdSelector = (state: IRootState) =>
  state.server.publicSettings?.serverId;

export const publicServerSettingsSelector = (state: IRootState) =>
  state.server.publicSettings;

export const pluginsEnabledSelector = (state: IRootState) =>
  !!state.server.publicSettings?.enablePlugins;

export const infoSelector = (state: IRootState) => state.server.info;

export const activeFullscreenPluginIdSelector = (state: IRootState) =>
  state.server.activeFullscreenPluginId;

export const dmsOpenSelector = (state: IRootState) => state.server.dmsOpen;

export const ownUserRolesSelector = createSelector(
  [ownUserSelector, rolesSelector],
  (ownUser, roles) => {
    if (!ownUser?.roleIds) return [];
    return roles.filter((role) => ownUser.roleIds.includes(role.id));
  }
);

export const isOwnUserOwnerSelector = createSelector(
  [ownUserRolesSelector],
  (ownUserRoles) => ownUserRoles.some((role) => role.id === OWNER_ROLE_ID)
);

export const hasVisibleChannelsInCategorySelector = createCachedSelector(
  [
    (state: IRootState, categoryId: number) =>
      channelsByCategoryIdSelector(state, categoryId),
    channelPermissionsSelector,
    isOwnUserOwnerSelector
  ],
  (channelsInCategory, channelPermissions, isOwner) => {
    if (isOwner) return true;
    if (channelsInCategory.length === 0) return false;

    for (const channel of channelsInCategory) {
      if (!channel.private) return true;
      const permissions =
        channelPermissions[channel.id]?.permissions ??
        ({} as Record<string, boolean>);
      if (permissions[ChannelPermission.VIEW_CHANNEL] === true) return true;
    }
    return false;
  }
)((_, categoryId: number) => categoryId);

export const visibleChannelsInCategorySelector = createCachedSelector(
  [
    (state: IRootState, categoryId: number) =>
      channelsByCategoryIdSelector(state, categoryId),
    channelPermissionsSelector,
    isOwnUserOwnerSelector
  ],
  (channelsInCategory, channelPermissions, isOwner) =>
    channelsInCategory.filter((channel) =>
      canViewChannel(channel, channelPermissions, isOwner)
    )
)((_, categoryId: number) => categoryId);

export const userRolesSelector = createSelector(
  [rolesSelector, userByIdSelector],
  (roles, user) => {
    if (!user?.roleIds) return [];
    return roles.filter((role) => user.roleIds.includes(role.id));
  }
);

export const userRolesIdsSelector = createSelector(
  [userByIdSelector],
  (user) => user?.roleIds || []
);

export const typingUsersByChannelIdSelector = createCachedSelector(
  [
    typingMapSelector,
    (_: IRootState, channelId: number) => channelId,
    ownUserIdSelector,
    usersSelector
  ],
  (typingMap, channelId, ownUserId, users) => {
    const userIds = typingMap[channelId] || [];

    return userIds
      .filter((id) => id !== ownUserId)
      .map((id) => users.find((u) => u.id === id))
      .filter((u) => !!u);
  }
)((_, channelId: number) => channelId);

export const hasSharingScreenUsersSelector = createCachedSelector(
  [voiceChannelStateSelector, (_: IRootState, channelId: number) => channelId],
  (voiceState) => {
    if (!voiceState) return false;

    return Object.values(voiceState.users).some((u) => u.sharingScreen);
  }
)((_, channelId: number) => channelId);

export const typingUsersByThreadIdSelector = createCachedSelector(
  [
    threadTypingMapSelector,
    (_: IRootState, parentMessageId: number) => parentMessageId,
    ownUserIdSelector,
    usersSelector
  ],
  (threadTypingMap, parentMessageId, ownUserId, users) => {
    const userIds = threadTypingMap[parentMessageId] || [];

    return userIds
      .filter((id) => id !== ownUserId)
      .map((id) => users.find((u) => u.id === id)!)
      .filter((u) => !!u);
  }
)((_, parentMessageId: number) => `thread-${parentMessageId}`);

export const voiceUsersByChannelIdSelector = createSelector(
  [usersSelector, voiceChannelStateSelector],
  (users, voiceState) => {
    const voiceUsers: TVoiceUser[] = [];

    if (!voiceState) return voiceUsers;

    Object.entries(voiceState.users).forEach(([userIdStr, state]) => {
      const userId = Number(userIdStr);
      const user = users.find((u) => u.id === userId);

      if (user) {
        voiceUsers.push({
          ...user,
          state
        });
      }
    });

    return voiceUsers;
  }
);

export const ownVoiceUserSelector = createSelector(
  [
    ownUserIdSelector,
    (state: IRootState) => {
      const channelId = currentVoiceChannelIdSelector(state);

      if (channelId === undefined) return undefined;

      return voiceUsersByChannelIdSelector(state, channelId);
    }
  ],
  (ownUserId, voiceUsers) =>
    voiceUsers?.find((voiceUser) => voiceUser.id === ownUserId)
);

// this approach has some limitations but it should work for most cases
export const hasUnreadMentionsSelector = createCachedSelector(
  [
    channelReadStateByIdSelector,
    channelByIdSelector,
    messagesByChannelIdSelector,
    ownUserIdSelector
  ],
  (readState, channel, messages, ownUserId) => {
    if (!channel || !messages) return false;

    return hasUnreadMentionInMessages(readState, messages, ownUserId);
  }
)((_, channelId: number) => channelId);

export const categoryUnreadMessagesCountSelector = createCachedSelector(
  [visibleChannelsInCategorySelector, channelsReadStatesSelector],
  (channelsInCategory, readStatesMap) => {
    return channelsInCategory.reduce((total, channel) => {
      return total + (readStatesMap[channel.id] ?? 0);
    }, 0);
  }
)((_, categoryId: number) => categoryId);

export const categoryHasUnreadMentionsSelector = createCachedSelector(
  [
    visibleChannelsInCategorySelector,
    channelsReadStatesSelector,
    messagesMapSelector,
    ownUserIdSelector
  ],
  (channelsInCategory, readStatesMap, messagesMap, ownUserId) => {
    return channelsInCategory.some((channel) => {
      return hasUnreadMentionInMessages(
        readStatesMap[channel.id] ?? 0,
        messagesMap[channel.id] ?? [],
        ownUserId
      );
    });
  }
)((_, categoryId: number) => categoryId);
