import { getLocalStorageItemBool, LocalStorageKey } from '@/helpers/storage';
import type { TDevices } from '@/types';
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
  browserNotifications: boolean;
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
  browserNotifications: getLocalStorageItemBool(
    LocalStorageKey.BROWSER_NOTIFICATIONS,
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
    setBrowserNotifications: (state, action: PayloadAction<boolean>) => {
      state.browserNotifications = action.payload;
    }
  }
});

const appSliceActions = appSlice.actions;
const appSliceReducer = appSlice.reducer;

export { appSliceActions, appSliceReducer };
