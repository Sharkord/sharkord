import {
  DESKTOP_BRIDGE_VERSION,
  getDesktopMismatch,
  type TDesktopBridge,
  type TDesktopEntry,
  type TNotificationTarget
} from '@sharkord/shared';
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { BridgeChannel } from '../shared/bridge-channels';

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
  setVoiceActive: (active) => {
    ipcRenderer.send(BridgeChannel.SET_VOICE_ACTIVE, active);
  },
  startSystemAudio: () => ipcRenderer.invoke(BridgeChannel.START_SYSTEM_AUDIO),
  stopSystemAudio: () => ipcRenderer.invoke(BridgeChannel.STOP_SYSTEM_AUDIO),
  setHotkeys: (bindings) =>
    ipcRenderer.invoke(BridgeChannel.SET_HOTKEYS, bindings),
  onHotkey: (listener) => {
    const handler = (_event: IpcRendererEvent, actionId: string) => {
      listener(actionId);
    };

    ipcRenderer.on(BridgeChannel.HOTKEY_PRESSED, handler);

    return () => {
      ipcRenderer.removeListener(BridgeChannel.HOTKEY_PRESSED, handler);
    };
  },
  showNotification: (notification) => {
    ipcRenderer.send(BridgeChannel.SHOW_NOTIFICATION, notification);
  },
  onNotificationClick: (listener) => {
    const handler = (_event: IpcRendererEvent, target: TNotificationTarget) => {
      listener(target);
    };

    ipcRenderer.on(BridgeChannel.NOTIFICATION_CLICKED, handler);

    return () => {
      ipcRenderer.removeListener(BridgeChannel.NOTIFICATION_CLICKED, handler);
    };
  }
};

let isClaimed = false;

const entry: TDesktopEntry = {
  version: DESKTOP_BRIDGE_VERSION,
  connect: (clientVersion) => {
    if (isClaimed || !Number.isInteger(clientVersion)) {
      return undefined;
    }

    isClaimed = true;

    const mismatch = getDesktopMismatch(DESKTOP_BRIDGE_VERSION, clientVersion);

    if (mismatch) {
      ipcRenderer.send(BridgeChannel.CLIENT_MISMATCH, mismatch);

      return undefined;
    }

    ipcRenderer.send(BridgeChannel.CLIENT_CONNECTED);

    return bridge;
  }
};

contextBridge.exposeInMainWorld('sharkordDesktop', entry);
