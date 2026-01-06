import { createSelector } from '@reduxjs/toolkit';
import { OWNER_ROLE_ID } from '@sharkord/shared';
import { createCachedSelector } from 're-reselect';
import type { IRootState } from '../store';
import { currentVoiceChannelIdSelector } from './channels/selectors';
import { typingMapSelector } from './messages/selectors';
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

export const infoSelector = (state: IRootState) => state.server.info;

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
      .map((id) => users.find((u) => u.id === id)!)
      .filter((u) => !!u);
  }
)((_, channelId: number) => channelId);

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
