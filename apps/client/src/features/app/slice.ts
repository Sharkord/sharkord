import { getLocalStorageItemBool, LocalStorageKey } from '@/helpers/storage';
import type { TDevices } from '@/types';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { TDirectMessageConversation } from '@sharkord/shared';

export interface TAppState {
  appLoading: boolean;
  isAutoConnecting: boolean;
  loadingPlugins: boolean;
  devices: TDevices | undefined;
  modViewOpen: boolean;
  modViewUserId: number | undefined;
  threadSidebarOpen: boolean;
  threadParentMessageId: number | undefined;
  threadChannelId: number | undefined;
  autoJoinLastChannel: boolean;
  dmsOpen: boolean;
  selectedDmChannelId: number | undefined;
  dmConversations: TDirectMessageConversation[];
  browserNotifications: boolean;
  browserNotificationsForMentions: boolean;
  browserNotificationsForDms: boolean;
}

const initialState: TAppState = {
  appLoading: true,
  isAutoConnecting: false,
  loadingPlugins: true,
  devices: undefined,
  modViewOpen: false,
  modViewUserId: undefined,
  threadSidebarOpen: false,
  threadParentMessageId: undefined,
  threadChannelId: undefined,
  autoJoinLastChannel: getLocalStorageItemBool(
    LocalStorageKey.AUTO_JOIN_LAST_CHANNEL,
    false
  ),
  dmsOpen: false,
  selectedDmChannelId: undefined,
  dmConversations: [],
  browserNotifications: getLocalStorageItemBool(
    LocalStorageKey.BROWSER_NOTIFICATIONS,
    false
  ),
  browserNotificationsForMentions: getLocalStorageItemBool(
    LocalStorageKey.BROWSER_NOTIFICATIONS_FOR_MENTIONS,
    false
  ),
  browserNotificationsForDms: getLocalStorageItemBool(
    LocalStorageKey.BROWSER_NOTIFICATIONS_FOR_DMS,
    false
  )
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setAppLoading: (state, action: PayloadAction<boolean>) => {
      state.appLoading = action.payload;
    },
    setDevices: (state, action: PayloadAction<TDevices>) => {
      state.devices = action.payload;
    },
    setLoadingPlugins: (state, action: PayloadAction<boolean>) => {
      state.loadingPlugins = action.payload;
    },
    setModViewOpen: (
      state,
      action: PayloadAction<{
        modViewOpen: boolean;
        userId?: number;
      }>
    ) => {
      state.modViewOpen = action.payload.modViewOpen;
      state.modViewUserId = action.payload.userId;
    },
    setThreadSidebarOpen: (
      state,
      action: PayloadAction<{
        open: boolean;
        parentMessageId?: number;
        channelId?: number;
      }>
    ) => {
      state.threadSidebarOpen = action.payload.open;
      state.threadParentMessageId = action.payload.parentMessageId;
      state.threadChannelId = action.payload.channelId;
    },
    setAutoJoinLastChannel: (state, action: PayloadAction<boolean>) => {
      state.autoJoinLastChannel = action.payload;
    },
    setIsAutoConnecting: (state, action: PayloadAction<boolean>) => {
      state.isAutoConnecting = action.payload;
    },
    setDmsOpen: (state, action: PayloadAction<boolean>) => {
      state.dmsOpen = action.payload;
    },
    setSelectedDmChannelId: (
      state,
      action: PayloadAction<number | undefined>
    ) => {
      state.selectedDmChannelId = action.payload;
    },
    setDmConversations: (
      state,
      action: PayloadAction<TDirectMessageConversation[]>
    ) => {
      state.dmConversations = action.payload;
    },
    addDmConversation: (
      state,
      action: PayloadAction<TDirectMessageConversation>
    ) => {
      // upsert -- replace if the conversation already exists, otherwise insert
      const idx = state.dmConversations.findIndex(
        (c) => c.channelId === action.payload.channelId
      );

      if (idx !== -1) {
        state.dmConversations[idx] = action.payload;
      } else {
        state.dmConversations.push(action.payload);
      }

      // keep sorted by most recent message first
      state.dmConversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    },
    updateDmConversationLastMessage: (
      state,
      action: PayloadAction<{ channelId: number; lastMessageAt: number }>
    ) => {
      const conv = state.dmConversations.find(
        (c) => c.channelId === action.payload.channelId
      );

      if (!conv) return;

      conv.lastMessageAt = action.payload.lastMessageAt;

      // re-sort so the updated conversation bubbles to the correct position
      state.dmConversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    },
    setBrowserNotifications: (state, action: PayloadAction<boolean>) => {
      state.browserNotifications = action.payload;
    },
    setBrowserNotificationsForMentions: (
      state,
      action: PayloadAction<boolean>
    ) => {
      state.browserNotificationsForMentions = action.payload;
    },
    setBrowserNotificationsForDms: (state, action: PayloadAction<boolean>) => {
      state.browserNotificationsForDms = action.payload;
    }
  }
});

const appSliceActions = appSlice.actions;
const appSliceReducer = appSlice.reducer;

export { appSliceActions, appSliceReducer };
