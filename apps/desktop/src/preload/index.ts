import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { TIpcArgs, TIpcChannel, TIpcResult } from '../main/ipc/contract';
import { IpcChannel } from '../shared/constants';
import type { TDesktopApi, TServersState, TUpdateState } from '../shared/types';

const invoke = <C extends TIpcChannel>(
  channel: C,
  ...args: TIpcArgs<C>
): Promise<TIpcResult<C>> => ipcRenderer.invoke(channel, ...args);

const api: TDesktopApi = {
  getState: () => invoke(IpcChannel.GET_STATE),
  onStateChange: (listener) => {
    const handler = (_event: IpcRendererEvent, state: TServersState) => {
      listener(state);
    };

    ipcRenderer.on(IpcChannel.STATE_CHANGED, handler);

    return () => {
      ipcRenderer.removeListener(IpcChannel.STATE_CHANGED, handler);
    };
  },
  addServer: (input) => invoke(IpcChannel.ADD_SERVER, input),
  removeServer: (id) => invoke(IpcChannel.REMOVE_SERVER, id),
  setOverlay: (open) => invoke(IpcChannel.SET_OVERLAY, open),
  selectServer: (id) => invoke(IpcChannel.SELECT_SERVER, id),
  setAdding: (adding) => invoke(IpcChannel.SET_ADDING, adding),
  setRailHidden: (hidden) => invoke(IpcChannel.SET_RAIL_HIDDEN, hidden),
  setSettingsOpen: (open) => invoke(IpcChannel.SET_SETTINGS_OPEN, open),
  updateSettings: (settings) => invoke(IpcChannel.UPDATE_SETTINGS, settings),
  togglePerformanceOverlay: () => invoke(IpcChannel.TOGGLE_PERFORMANCE_OVERLAY),
  toggleMenuBar: () => invoke(IpcChannel.TOGGLE_MENU_BAR),
  getUpdateState: () => invoke(IpcChannel.GET_UPDATE_STATE),
  onUpdateStateChange: (listener) => {
    const handler = (_event: IpcRendererEvent, state: TUpdateState) => {
      listener(state);
    };

    ipcRenderer.on(IpcChannel.UPDATE_STATE_CHANGED, handler);

    return () => {
      ipcRenderer.removeListener(IpcChannel.UPDATE_STATE_CHANGED, handler);
    };
  },
  checkForUpdates: () => invoke(IpcChannel.CHECK_FOR_UPDATES),
  downloadUpdate: () => invoke(IpcChannel.DOWNLOAD_UPDATE),
  installUpdate: () => invoke(IpcChannel.INSTALL_UPDATE),
  getAppFolder: () => invoke(IpcChannel.GET_APP_FOLDER),
  openAppFolder: () => invoke(IpcChannel.OPEN_APP_FOLDER)
};

contextBridge.exposeInMainWorld('desktop', api);
