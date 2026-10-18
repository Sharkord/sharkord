import type { TDesktopBridge, TDesktopConfirmOptions } from '@sharkord/shared';
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { BridgeChannel } from '../shared/bridge-channels';

type TConfirmationHandler = (
  options: TDesktopConfirmOptions
) => Promise<boolean>;

let confirmationHandler: TConfirmationHandler | null = null;

ipcRenderer.on(
  BridgeChannel.CONFIRM_REQUEST,
  async (
    _event: IpcRendererEvent,
    requestId: number,
    options: TDesktopConfirmOptions
  ) => {
    const answer = confirmationHandler
      ? await confirmationHandler(options)
      : null;

    ipcRenderer.send(BridgeChannel.CONFIRM_RESPONSE, requestId, answer);
  }
);

const bridge: TDesktopBridge = {
  getServerListVisible: () =>
    ipcRenderer.invoke(BridgeChannel.GET_RAIL_VISIBLE),
  onServerListVisibleChange: (listener) => {
    const handler = (_event: IpcRendererEvent, visible: boolean) => {
      listener(visible);
    };

    ipcRenderer.on(BridgeChannel.RAIL_VISIBLE_CHANGED, handler);

    return () => {
      ipcRenderer.removeListener(BridgeChannel.RAIL_VISIBLE_CHANGED, handler);
    };
  },
  toggleServerList: () => ipcRenderer.invoke(BridgeChannel.TOGGLE_RAIL),
  openSettings: () => ipcRenderer.invoke(BridgeChannel.OPEN_SETTINGS),
  setUnreadState: (state) => {
    ipcRenderer.send(BridgeChannel.SET_UNREAD, state);
  },
  setConnectionState: (state) => {
    ipcRenderer.send(BridgeChannel.SET_CONNECTION_STATE, state);
  },
  setConfirmationHandler: (handler) => {
    confirmationHandler = handler;

    return () => {
      if (confirmationHandler === handler) {
        confirmationHandler = null;
      }
    };
  }
};

contextBridge.exposeInMainWorld('sharkordDesktop', bridge);
