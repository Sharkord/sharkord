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

export const browserNotificationsSelector = (state: IRootState) =>
  state.app.browserNotifications;

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
