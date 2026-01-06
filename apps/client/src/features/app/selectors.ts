import type { IRootState } from '../store';

export const appLoadingSelector = (state: IRootState) => state.app.loading;

export const devicesSelector = (state: IRootState) => state.app.devices;

export const modViewOpenSelector = (state: IRootState) => state.app.modViewOpen;

export const modViewUserIdSelector = (state: IRootState) =>
  state.app.modViewUserId;
