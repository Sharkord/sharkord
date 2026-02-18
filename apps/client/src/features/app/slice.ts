import type { TDevices } from '@/types';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface TAppState {
  appLoading: boolean;
  loadingPlugins: boolean;
  devices: TDevices | undefined;
  modViewOpen: boolean;
  modViewUserId?: number;
}

const initialState: TAppState = {
  appLoading: true,
  loadingPlugins: true,
  devices: undefined,
  modViewOpen: false,
  modViewUserId: undefined
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
    }
  }
});

const appSliceActions = appSlice.actions;
const appSliceReducer = appSlice.reducer;

export { appSliceActions, appSliceReducer };
