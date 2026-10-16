import type { IRootState } from '@/features/store';
import { useHotkeyState } from '@/hooks/use-hotkeys';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  appLoadingSelector,
  autoJoinLastChannelSelector,
  browserNotificationsForDmsSelector,
  browserNotificationsForMentionsSelector,
  browserNotificationsForRepliesSelector,
  browserNotificationsSelector,
  hotkeysEnabledSelector,
  isAutoConnectingSelector,
  isChannelMutedSelector,
  isShiftHeldSelector,
  loadingPluginsSelector,
  messageJumpTargetSelector,
  messageSentSoundSelector,
  micModeSelector,
  modViewOpenSelector,
  modViewUserIdSelector,
  notificationSoundsSelector,
  pluginSlotDebugSelector,
  pushToTalkSelectedSelector,
  selectedDmChannelIdSelector,
  threadSidebarDataSelector,
  voiceChatSidebarDataSelector
} from './selectors';

export const useIsAppLoading = () => useSelector(appLoadingSelector);

export const useIsAutoConnecting = () => useSelector(isAutoConnectingSelector);

export const useIsPluginsLoading = () => useSelector(loadingPluginsSelector);

export const useModViewOpen = () => {
  const isOpen = useSelector(modViewOpenSelector);
  const userId = useSelector(modViewUserIdSelector);

  return useMemo(() => ({ isOpen, userId }), [isOpen, userId]);
};

export const useThreadSidebar = () => useSelector(threadSidebarDataSelector);

export const useAutoJoinLastChannel = () =>
  useSelector(autoJoinLastChannelSelector);

export const useHotkeysEnabled = () => useSelector(hotkeysEnabledSelector);

export const usePushToTalkActive = () => {
  const pushToTalkSelected = useSelector(pushToTalkSelectedSelector);
  const { status, capabilities } = useHotkeyState();

  return pushToTalkSelected && status === 'connected' && capabilities.keyUp;
};

export const useMicMode = () => useSelector(micModeSelector);

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

export const useNotificationSounds = () =>
  useSelector(notificationSoundsSelector);

export const useMessageSentSound = () => useSelector(messageSentSoundSelector);

export const useIsChannelMuted = (channelId: number) =>
  useSelector((state: IRootState) => isChannelMutedSelector(state, channelId));
