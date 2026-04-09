import {
  getLocalStorageItemAsNumber,
  getLocalStorageItemBool,
  LocalStorageKey
} from '@/helpers/storage';
import type { TDevices, TMessageJumpToTarget } from '@/types';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

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
  selectedDmChannelId: number | undefined;
  browserNotifications: boolean;
  browserNotificationsForMentions: boolean;
  browserNotificationsForDms: boolean;
  browserNotificationsForReplies: boolean;
  messageJumpTarget: TMessageJumpToTarget | undefined;
  voiceChatSidebarOpen: boolean;
  voiceChatChannelId: number | undefined;
  pluginSlotDebug: boolean;
  modifierKeysHeldMap: Record<string, boolean>;
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
  selectedDmChannelId: undefined,
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
  ),
  browserNotificationsForReplies: getLocalStorageItemBool(
    LocalStorageKey.BROWSER_NOTIFICATIONS_FOR_REPLIES,
    false
  ),
  messageJumpTarget: undefined,
  voiceChatSidebarOpen: getLocalStorageItemBool(
    LocalStorageKey.VOICE_CHAT_SIDEBAR_STATE,
    false
  ),
  voiceChatChannelId: getLocalStorageItemAsNumber(
    LocalStorageKey.VOICE_CHAT_SIDEBAR_CHANNEL_ID
  ),
  pluginSlotDebug: getLocalStorageItemBool(
    LocalStorageKey.PLUGIN_SLOT_DEBUG,
    false
  ),
  modifierKeysHeldMap: { Shift: false, Control: false, Alt: false }
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
    setSelectedDmChannelId: (
      state,
      action: PayloadAction<number | undefined>
    ) => {
      state.selectedDmChannelId = action.payload;
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
    },
    setBrowserNotificationsForReplies: (
      state,
      action: PayloadAction<boolean>
    ) => {
      state.browserNotificationsForReplies = action.payload;
    },
    setMessageJumpTarget: (
      state,
      action: PayloadAction<TMessageJumpToTarget | undefined>
    ) => {
      state.messageJumpTarget = action.payload;
    },
    setVoiceChatSidebar: (
      state,
      action: PayloadAction<{
        open: boolean;
        channelId?: number;
      }>
    ) => {
      state.voiceChatSidebarOpen = action.payload.open;
      state.voiceChatChannelId = action.payload.channelId;
    },
    setPluginSlotDebug: (state, action: PayloadAction<boolean>) => {
      state.pluginSlotDebug = action.payload;
    },
    setModifierKeysHeldMap: (
      state,
      action: PayloadAction<Record<string, boolean>>
    ) => {
      state.modifierKeysHeldMap = action.payload;
    }
  }
});

const appSliceActions = appSlice.actions;
const appSliceReducer = appSlice.reducer;

export { appSliceActions, appSliceReducer };
