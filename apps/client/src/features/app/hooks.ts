import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  appLoadingSelector,
  autoJoinLastChannelSelector,
  browserNotificationsSelector,
  devicesSelector,
  isAutoConnectingSelector,
  loadingPluginsSelector,
  modViewOpenSelector,
  modViewUserIdSelector,
  threadSidebarDataSelector
} from './selectors';

export const useIsAppLoading = () => useSelector(appLoadingSelector);

export const useIsAutoConnecting = () => useSelector(isAutoConnectingSelector);

export const useIsPluginsLoading = () => useSelector(loadingPluginsSelector);

export const useDevices = () => useSelector(devicesSelector);

export const useModViewOpen = () => {
  const isOpen = useSelector(modViewOpenSelector);
  const userId = useSelector(modViewUserIdSelector);

  return useMemo(() => ({ isOpen, userId }), [isOpen, userId]);
};

export const useThreadSidebar = () => useSelector(threadSidebarDataSelector);

export const useAutoJoinLastChannel = () =>
  useSelector(autoJoinLastChannelSelector);

export const useBrowserNotifications = () =>
  useSelector(browserNotificationsSelector);
