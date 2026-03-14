import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { IRootState } from '../store';
import {
  appLoadingSelector,
  autoJoinLastChannelSelector,
  browserNotificationsForDmsSelector,
  browserNotificationsForMentionsSelector,
  browserNotificationsSelector,
  devicesSelector,
  dmConversationByChannelIdSelector,
  dmConversationsSelector,
  dmsOpenSelector,
  isAutoConnectingSelector,
  loadingPluginsSelector,
  messageJumpTargetSelector,
  modViewOpenSelector,
  modViewUserIdSelector,
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

export const useDmsOpen = () => useSelector(dmsOpenSelector);

export const useSelectedDmChannelId = () =>
  useSelector(selectedDmChannelIdSelector);

export const useBrowserNotifications = () =>
  useSelector(browserNotificationsSelector);

export const useBrowserNotificationsForMentions = () =>
  useSelector(browserNotificationsForMentionsSelector);

export const useBrowserNotificationsForDms = () =>
  useSelector(browserNotificationsForDmsSelector);

export const useDmConversations = () => useSelector(dmConversationsSelector);

export const useDmConversationByChannelId = (channelId: number) =>
  useSelector((state: IRootState) =>
    dmConversationByChannelIdSelector(state, channelId)
  );

export const useMessageJumpTarget = () =>
  useSelector(messageJumpTargetSelector);

export const useVoiceChatSidebar = () =>
  useSelector(voiceChatSidebarDataSelector);
