import { createSelector } from '@reduxjs/toolkit';
import { createCachedSelector } from 're-reselect';
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

export const dmsOpenSelector = (state: IRootState) => state.app.dmsOpen;

export const selectedDmChannelIdSelector = (state: IRootState) =>
  state.app.selectedDmChannelId;

export const browserNotificationsSelector = (state: IRootState) =>
  state.app.browserNotifications;

export const browserNotificationsForMentionsSelector = (state: IRootState) =>
  state.app.browserNotificationsForMentions;

export const browserNotificationsForDmsSelector = (state: IRootState) =>
  state.app.browserNotificationsForDms;

export const dmConversationsSelector = (state: IRootState) =>
  state.app.dmConversations;

export const dmConversationByChannelIdSelector = createCachedSelector(
  [dmConversationsSelector, (_: IRootState, channelId: number) => channelId],
  (conversations, channelId) =>
    conversations.find((dm) => dm.channelId === channelId)
)((_, channelId: number) => channelId);

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
