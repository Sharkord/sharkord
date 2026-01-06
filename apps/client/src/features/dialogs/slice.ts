import type { Dialog } from '@/components/dialogs/dialogs';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { TGenericObject } from '@sharkord/shared';

export type TDialogState = {
  openDialog: Dialog | undefined;
  props: TGenericObject;
  isOpen: boolean;
  closing: boolean;
};

const initialState: TDialogState = {
  openDialog: undefined,
  props: {},
  isOpen: false,
  closing: false
};

export const dialogSlice = createSlice({
  name: 'dialog',
  initialState,
  reducers: {
    resetDialogs: () => initialState,
    openDialog: (
      state,
      action: PayloadAction<{ dialog: Dialog; props?: TGenericObject }>
    ) => {
      state.openDialog = action.payload.dialog;
      state.props = action.payload.props || {};
      state.isOpen = true;
    },
    closeDialogs: (state) => {
      state.openDialog = undefined;
      state.props = {};
      state.isOpen = false;
      state.closing = false;
    },
    setClosing: (state, action: PayloadAction<boolean>) => {
      state.closing = action.payload;
    }
  }
});

const dialogSliceActions = dialogSlice.actions;
const dialogSliceReducer = dialogSlice.reducer;

export { dialogSliceActions, dialogSliceReducer };
