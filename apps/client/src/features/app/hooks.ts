import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  appLoadingSelector,
  autoJoinLastChannelSelector,
  browserNotificationsForDmsSelector,
  browserNotificationsForMentionsSelector,
  browserNotificationsForRepliesSelector,
  browserNotificationsSelector,
  devicesSelector,
  isAltHeldSelector,
  isAutoConnectingSelector,
  isCtrlHeldSelector,
  isShiftHeldSelector,
  loadingPluginsSelector,
  messageJumpTargetSelector,
  modViewOpenSelector,
  modViewUserIdSelector,
  pluginSlotDebugSelector,
  selectedDmChannelIdSelector,
  threadSidebarDataSelector,
  voiceChatSidebarDataSelector
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

export const useSelectedDmChannelId = () =>
  useSelector(selectedDmChannelIdSelector);

export const useBrowserNotifications = () =>
  useSelector(browserNotificationsSelector);

export const useBrowserNotificationsForMentions = () =>
  useSelector(browserNotificationsForMentionsSelector);

export const useBrowserNotificationsForDms = () =>
  useSelector(browserNotificationsForDmsSelector);

export const useMessageJumpTarget = () =>
  useSelector(messageJumpTargetSelector);

export const useBrowserNotificationsForReplies = () =>
  useSelector(browserNotificationsForRepliesSelector);

export const useVoiceChatSidebar = () =>
  useSelector(voiceChatSidebarDataSelector);

export const usePluginSlotDebug = () => useSelector(pluginSlotDebugSelector);

export const useIsShiftHeld = () => useSelector(isShiftHeldSelector);

export const useIsCtrlHeld = () => useSelector(isCtrlHeldSelector);

export const useIsAltHeld = () => useSelector(isAltHeldSelector);
