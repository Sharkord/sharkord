import { getTRPCClient } from '@/lib/trpc';
import {
  ChannelPermission,
  Permission,
  linkifyHtml,
  type TPluginSlotContext
} from '@sharkord/shared';
import { useCallback, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { IRootState } from '../store';
import { useChannelById, useChannelPermissionsById } from './channels/hooks';
import { channelReadStateByIdSelector } from './channels/selectors';
import {
  connectedSelector,
  connectingSelector,
  disconnectInfoSelector,
  infoSelector,
  isOwnUserOwnerSelector,
  ownUserRolesSelector,
  ownVoiceUserSelector,
  pluginComponentContextSelector,
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

export const usePluginComponentContext = (): TPluginSlotContext => {
  const stateCtx = useSelector(pluginComponentContextSelector);
  const controllerRef = useRef(
    (() => ({
      sendMessage: async (channelId: number, content: string) => {
        const trpc = getTRPCClient();

        await trpc.messages.send.mutate({
          channelId,
          content: linkifyHtml(`<p>${content}</p>`),
          files: []
        });
      }
    }))()
  );

  return useMemo<TPluginSlotContext>(
    () => ({
      ...stateCtx,
      ...controllerRef.current
    }),
    [stateCtx]
  );
};
