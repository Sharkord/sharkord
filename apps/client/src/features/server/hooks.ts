import { ChannelPermission, Permission } from '@sharkord/shared';
import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { IRootState } from '../store';
import { useChannelById, useChannelPermissionsById } from './channels/hooks';
import { channelReadStateByIdSelector } from './channels/selectors';
import {
  activeFullscreenPluginIdSelector,
  categoryHasUnreadMentionsSelector,
  categoryUnreadMessagesCountSelector,
  connectedSelector,
  connectingSelector,
  disconnectInfoSelector,
  dmsOpenSelector,
  hasSharingScreenUsersSelector,
  hasUnreadMentionsSelector,
  hasVisibleChannelsInCategorySelector,
  infoSelector,
  isOwnUserOwnerSelector,
  ownUserRolesSelector,
  ownVoiceUserSelector,
  pluginsEnabledSelector,
  publicServerSettingsSelector,
  serverNameSelector,
  typingUsersByChannelIdSelector,
  typingUsersByThreadIdSelector,
  userRolesSelector,
  voiceUsersByChannelIdSelector
} from './selectors';

export const useIsConnected = () => useSelector(connectedSelector);

export const useIsConnecting = () => useSelector(connectingSelector);

export const useDisconnectInfo = () => useSelector(disconnectInfoSelector);

export const useServerName = () => useSelector(serverNameSelector);

export const usePublicServerSettings = () =>
  useSelector(publicServerSettingsSelector);

export const useOwnUserRoles = () => useSelector(ownUserRolesSelector);

export const useInfo = () => useSelector(infoSelector);

export const useIsOwnUserOwner = () => useSelector(isOwnUserOwnerSelector);

export const usePluginsEnabled = () => useSelector(pluginsEnabledSelector);

export const useCan = () => {
  const ownUserRoles = useOwnUserRoles();
  const isOwner = useIsOwnUserOwner();

  // TODO: maybe this can can recieve both Permission and ChannelPermission?
  const can = useCallback(
    (permission: Permission | Permission[]) => {
      if (isOwner) return true;

      const permissionsToCheck = Array.isArray(permission)
        ? permission
        : [permission];

      for (const role of ownUserRoles) {
        for (const perm of role.permissions) {
          if (permissionsToCheck.includes(perm)) {
            return true;
          }
        }
      }

      return false;
    },
    [ownUserRoles, isOwner]
  );

  return can;
};

export const useChannelCan = (channelId: number | undefined) => {
  const ownUserRoles = useChannelPermissionsById(channelId || -1);
  const isOwner = useIsOwnUserOwner();
  const channel = useChannelById(channelId || -1);

  const can = useCallback(
    (permission: ChannelPermission) => {
      if (isOwner || !channel || !channel?.private) return true;

      // if VIEW is false, no other permission matters
      if (ownUserRoles.permissions[ChannelPermission.VIEW_CHANNEL] === false)
        return false;

      return ownUserRoles.permissions[permission] === true;
    },
    [ownUserRoles, isOwner, channel]
  );

  return can;
};

// Returns true if the user can view at least one of the channels in the category
export const useHasVisibleChannelsInCategory = (categoryId: number) =>
  useSelector((state: IRootState) =>
    hasVisibleChannelsInCategorySelector(state, categoryId)
  );

export const useUserRoles = (userId: number) =>
  useSelector((state: IRootState) => userRolesSelector(state, userId));

export const useTypingUsersByChannelId = (channelId: number) =>
  useSelector((state: IRootState) =>
    typingUsersByChannelIdSelector(state, channelId)
  );

export const useTypingUsersByThreadId = (parentMessageId: number) =>
  useSelector((state: IRootState) =>
    typingUsersByThreadIdSelector(state, parentMessageId)
  );

export const useVoiceUsersByChannelId = (channelId: number) =>
  useSelector((state: IRootState) =>
    voiceUsersByChannelIdSelector(state, channelId)
  );

export const useOwnVoiceUser = () => useSelector(ownVoiceUserSelector);

export const useUnreadMessagesCount = (channelId: number) =>
  useSelector((state: IRootState) =>
    channelReadStateByIdSelector(state, channelId)
  );

export const useCategoryUnreadMessagesCount = (categoryId: number) =>
  useSelector((state: IRootState) =>
    categoryUnreadMessagesCountSelector(state, categoryId)
  );

export const useCategoryHasUnreadMentions = (categoryId: number) =>
  useSelector((state: IRootState) =>
    categoryHasUnreadMentionsSelector(state, categoryId)
  );

export const useCategoryUnreadData = (categoryId: number) => {
  const unreadCount = useCategoryUnreadMessagesCount(categoryId);
  const hasUnreadMentions = useCategoryHasUnreadMentions(categoryId);

  return useMemo(
    () => ({ unreadCount, hasUnreadMentions }),
    [unreadCount, hasUnreadMentions]
  );
};

export const useHasSharingScreenUsers = (channelId: number) =>
  useSelector((state: IRootState) =>
    hasSharingScreenUsersSelector(state, channelId)
  );

export const useHasUnreadMentions = (channelId: number) =>
  useSelector((state: IRootState) =>
    hasUnreadMentionsSelector(state, channelId)
  );

export const useActiveFullscreenPluginId = () =>
  useSelector(activeFullscreenPluginIdSelector);

export const useDmsOpen = () => useSelector(dmsOpenSelector);
