import type { ServerScreen } from '@/components/server-screens/screens';
import { createSlice } from '@reduxjs/toolkit';
import type { TGenericObject } from '@sharkord/shared';

type TServerScreenState = {
  openServerScreen: ServerScreen | undefined;
  props?: TGenericObject;
  isOpen: boolean;
};

const initialState: TServerScreenState = {
  openServerScreen: undefined,
  props: {},
  isOpen: false
};

export const serverScreenSlice = createSlice({
  name: 'serverScreens',
  initialState,
  reducers: {
    resetServerScreens: () => initialState,
    openServerScreen: (
      state,
      action: {
        payload: { serverScreen: ServerScreen; props?: TGenericObject };
      }
    ) => {
      state.openServerScreen = action.payload.serverScreen;
      state.props = action.payload.props || {};
      state.isOpen = true;
    },
    closeServerScreens: (state) => {
      state.openServerScreen = undefined;
      state.props = {};
      state.isOpen = false;
    }
  }
});

const serverScreenSliceActions = serverScreenSlice.actions;
const serverScreenSliceReducer = serverScreenSlice.reducer;

export { serverScreenSliceActions, serverScreenSliceReducer };
