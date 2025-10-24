import { OWNER_ROLE_ID, Permission } from '@sharkord/shared';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  connectedSelector,
  connectingSelector,
  infoSelector,
  ownUserRoleSelector,
  publicServerSettingsSelector,
  serverNameSelector,
  userRoleSelector
} from './selectors';

export const useIsConnected = () => useSelector(connectedSelector);

export const useIsConnecting = () => useSelector(connectingSelector);

export const useServerName = () => useSelector(serverNameSelector);

export const usePublicServerSettings = () =>
  useSelector(publicServerSettingsSelector);

export const useOwnUserRole = () => useSelector(ownUserRoleSelector);

export const useInfo = () => useSelector(infoSelector);

export const useCan = () => {
  const ownUserRole = useOwnUserRole();

  const can = useCallback(
    (permission: Permission | Permission[]) => {
      if (!ownUserRole) return false;

      if (ownUserRole.id === OWNER_ROLE_ID) {
        return true;
      }

      if (Array.isArray(permission)) {
        return !!permission.some((perm) =>
          ownUserRole.permissions?.includes(perm)
        );
      }

      return !!ownUserRole.permissions?.includes(permission);
    },
    [ownUserRole]
  );

  return can;
};

export const useUserRole = (userId: number) =>
  useSelector((state) => userRoleSelector(state, userId));
