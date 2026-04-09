import { createSelector } from '@reduxjs/toolkit';
import type { IRootState } from '../store';

export const appLoadingSelector = (state: IRootState) => state.app.appLoading;

export const isAutoConnectingSelector = (state: IRootState) =>
  state.app.isAutoConnecting;

export const devicesSelector = (state: IRootState) => state.app.devices;

export const modViewOpenSelector = (state: IRootState) => state.app.modViewOpen;

export const modViewUserIdSelector = (state: IRootState) =>
  state.app.modViewUserId;

export const loadingPluginsSelector = (state: IRootState) =>
  state.app.loadingPlugins;

export const threadSidebarOpenSelector = (state: IRootState) =>
  state.app.threadSidebarOpen;

export const threadParentMessageIdSelector = (state: IRootState) =>
  state.app.threadParentMessageId;

export const threadChannelIdSelector = (state: IRootState) =>
  state.app.threadChannelId;

export const autoJoinLastChannelSelector = (state: IRootState) =>
  state.app.autoJoinLastChannel;

export const selectedDmChannelIdSelector = (state: IRootState) =>
  state.app.selectedDmChannelId;

export const browserNotificationsSelector = (state: IRootState) =>
  state.app.browserNotifications;

export const browserNotificationsForMentionsSelector = (state: IRootState) =>
  state.app.browserNotificationsForMentions;

export const browserNotificationsForDmsSelector = (state: IRootState) =>
  state.app.browserNotificationsForDms;

export const browserNotificationsForRepliesSelector = (state: IRootState) =>
  state.app.browserNotificationsForReplies;

export const messageJumpTargetSelector = (state: IRootState) =>
  state.app.messageJumpTarget;

export const voiceChatSidebarOpenSelector = (state: IRootState) =>
  state.app.voiceChatSidebarOpen;

export const voiceChatChannelIdSelector = (state: IRootState) =>
  state.app.voiceChatChannelId;

export const pluginSlotDebugSelector = (state: IRootState) =>
  state.app.pluginSlotDebug;

export const voiceChatSidebarDataSelector = createSelector(
  [voiceChatSidebarOpenSelector, voiceChatChannelIdSelector],
  (isOpen, channelId) => ({ isOpen, channelId })
);

export const threadSidebarDataSelector = createSelector(
  [
    threadSidebarOpenSelector,
    threadParentMessageIdSelector,
    threadChannelIdSelector
  ],
  (isOpen, parentMessageId, channelId) => ({
    isOpen,
    parentMessageId,
    channelId
  })
);

export const isShiftHeldSelector = (state: IRootState) =>
  state.app.modifierKeysHeldMap?.Shift ?? false;

export const isCtrlHeldSelector = (state: IRootState) =>
  state.app.modifierKeysHeldMap?.Control ?? false;

export const isAltHeldSelector = (state: IRootState) =>
  state.app.modifierKeysHeldMap?.Alt ?? false;
