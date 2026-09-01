import { createSelector } from '@reduxjs/toolkit';
import {
  OWNER_ROLE_ID,
  type TJoinedRole,
  type TPluginStoreState
} from '@sharkord/shared';
import { createCachedSelector } from 're-reselect';
import type { IRootState } from '../store';
import { categoriesSelector } from './categories/selectors';
import {
  channelByIdSelector,
  channelPermissionsSelector,
  channelReadStateByIdSelector,
  channelsByCategoryIdSelector,
  channelsReadStatesSelector,
  channelsSelector,
  currentVoiceChannelIdSelector,
  selectedChannelIdSelector
} from './channels/selectors';
import { emojisSelector } from './emojis/selectors';
import { canViewChannel, hasUnreadMentionInMessages } from './helpers';
import {
  messagesByChannelIdSelector,
  messagesMapSelector,
  threadTypingMapSelector,
  typingMapSelector
} from './messages/selectors';
import { pluginsMetadataSelector } from './plugins/selectors';
import { rolesSelector } from './roles/selectors';
import type { TVoiceUser } from './types';
import {
  ownUserIdSelector,
  ownUserSelector,
  userByIdSelector,
  usersMapSelector,
  usersSelector
} from './users/selectors';
import { voiceChannelStateSelector } from './voice/selectors';

export const connectedSelector = (state: IRootState) => state.server.connected;

export const disconnectInfoSelector = (state: IRootState) =>
  state.server.disconnectInfo;

export const reconnectSelector = (state: IRootState) => state.server.reconnect;

export const reconnectingSelector = (state: IRootState) =>
  !!state.server.reconnect;

export const serverNameSelector = (state: IRootState) =>
  state.server.publicSettings?.name;

export const publicServerSettingsSelector = (state: IRootState) =>
  state.server.publicSettings;

export const pluginsEnabledSelector = (state: IRootState) =>
  !!state.server.publicSettings?.enablePlugins;

export const webRtcSimulcastEnabledSelector = (state: IRootState) =>
  !!state.server.publicSettings?.webRtcSimulcastEnabled;

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

export const visibleChannelsInCategorySelector = createCachedSelector(
  [
    (state: IRootState, categoryId: number) =>
      channelsByCategoryIdSelector(state, categoryId),
    channelPermissionsSelector,
    isOwnUserOwnerSelector,
    currentVoiceChannelIdSelector
  ],
  (channelsInCategory, channelPermissions, isOwner, currentVoiceChannelId) =>
    channelsInCategory.filter((channel) =>
      canViewChannel(
        channel,
        channelPermissions,
        isOwner,
        currentVoiceChannelId
      )
    )
)((_, categoryId: number) => categoryId);

export const hasVisibleChannelsInCategorySelector = (
  state: IRootState,
  categoryId: number
) => visibleChannelsInCategorySelector(state, categoryId).length > 0;

export const referenceableChannelsSelector = createSelector(
  [
    channelsSelector,
    channelPermissionsSelector,
    isOwnUserOwnerSelector,
    currentVoiceChannelIdSelector
  ],
  (channels, channelPermissions, isOwner, currentVoiceChannelId) =>
    channels
      .filter(
        (channel) =>
          !channel.isDm &&
          canViewChannel(
            channel,
            channelPermissions,
            isOwner,
            currentVoiceChannelId
          )
      )
      .sort((a, b) => a.position - b.position || a.id - b.id)
);

const DEFAULT_ARRAY: unknown[] = [];

export const userRolesSelector = createCachedSelector(
  [rolesSelector, userByIdSelector, (_: IRootState, userId: number) => userId],
  (roles, user) => {
    if (!user?.roleIds) return DEFAULT_ARRAY as TJoinedRole[];

    return roles.filter((role) => user.roleIds.includes(role.id));
  }
)((_, userId: number) => userId);

const createTypingUsersSelector = (
  typingMap: (state: IRootState) => Record<number, number[]>,
  keyPrefix: string
) =>
  createCachedSelector(
    [
      typingMap,
      (_: IRootState, key: number) => key,
      ownUserIdSelector,
      usersMapSelector
    ],
    (map, key, ownUserId, usersMap) =>
      (map[key] ?? (DEFAULT_ARRAY as number[]))
        .filter((id) => id !== ownUserId)
        .map((id) => usersMap[id])
        .filter((user) => !!user)
  )((_, key: number) => `${keyPrefix}-${key}`);

export const typingUsersByChannelIdSelector = createTypingUsersSelector(
  typingMapSelector,
  'channel'
);

export const typingUsersByThreadIdSelector = createTypingUsersSelector(
  threadTypingMapSelector,
  'thread'
);

export const hasSharingScreenUsersSelector = createCachedSelector(
  [voiceChannelStateSelector],
  (voiceState) => {
    if (!voiceState) return false;

    return Object.values(voiceState.users).some((u) => u.sharingScreen);
  }
)((_, channelId: number) => channelId);

export const voiceUsersByChannelIdSelector = createCachedSelector(
  [
    usersMapSelector,
    voiceChannelStateSelector,
    (_: IRootState, channelId: number) => channelId
  ],
  (usersMap, voiceState) => {
    if (!voiceState) return DEFAULT_ARRAY as TVoiceUser[];

    const voiceUsers: TVoiceUser[] = [];

    Object.entries(voiceState.users).forEach(([userIdStr, state]) => {
      const user = usersMap[Number(userIdStr)];

      if (user) {
        voiceUsers.push({
          ...user,
          state
        });
      }
    });

    return voiceUsers;
  }
)((_, channelId: number) => channelId);

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

export const totalUnreadCountSelector = createSelector(
  [
    channelsSelector,
    channelsReadStatesSelector,
    channelPermissionsSelector,
    isOwnUserOwnerSelector,
    currentVoiceChannelIdSelector
  ],
  (channels, readStates, channelPermissions, isOwner, currentVoiceChannelId) =>
    channels.reduce((total, channel) => {
      const isVisible =
        channel.isDm ||
        canViewChannel(
          channel,
          channelPermissions,
          isOwner,
          currentVoiceChannelId
        );

      return isVisible ? total + (readStates[channel.id] ?? 0) : total;
    }, 0)
);

// memoized because plugins are told to read this through the store's getState,
// and the standard way to consume an external store in react requires the
// snapshot to keep its identity while nothing has changed. rebuilding the object
// on every call makes useSyncExternalStore re-render forever
export const mapStateToPluginState = createSelector(
  [
    usersSelector,
    channelsSelector,
    categoriesSelector,
    rolesSelector,
    emojisSelector,
    pluginsMetadataSelector,
    ownUserIdSelector,
    selectedChannelIdSelector,
    currentVoiceChannelIdSelector,
    publicServerSettingsSelector
  ],
  (
    users,
    channels,
    categories,
    roles,
    emojis,
    plugins,
    ownUserId,
    selectedChannelId,
    currentVoiceChannelId,
    publicSettings
  ): TPluginStoreState => ({
    users,
    channels,
    categories,
    roles,
    emojis,
    plugins,
    ownUserId,
    selectedChannelId,
    currentVoiceChannelId,
    publicSettings
  })
);
