import type { TAppNotification, TNotificationTarget } from './notifications';

export type TDesktopConfirmOptions = {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'info';
};

export type TDesktopUnreadState = {
  count: number;
  mentioned: boolean;
};

export type TDesktopConnectionState =
  | 'connecting'
  | 'connected'
  | 'signed-out'
  | 'disconnected';

export type TDesktopHotkeyBinding = {
  actionId: string;
  combo: string;
};

export type TDesktopHotkeyError = {
  actionId: string;
  reason: 'unsupported' | 'taken';
};

export type TDesktopBridge = {
  getServerListVisible: () => Promise<boolean>;
  onServerListVisibleChange: (
    listener: (visible: boolean) => void
  ) => () => void;
  toggleServerList: () => Promise<void>;
  openSettings: () => Promise<void>;
  setUnreadState: (state: TDesktopUnreadState) => void;
  setConnectionState: (state: TDesktopConnectionState) => void;
  startSystemAudio: () => Promise<boolean>;
  stopSystemAudio: () => Promise<void>;
  showNotification: (notification: TAppNotification) => void;
  setHotkeys: (
    bindings: TDesktopHotkeyBinding[]
  ) => Promise<TDesktopHotkeyError[]>;
  onHotkey: (listener: (actionId: string) => void) => () => void;
  onNotificationClick: (
    listener: (target: TNotificationTarget) => void
  ) => () => void;
  setConfirmationHandler: (
    handler: (options: TDesktopConfirmOptions) => Promise<boolean>
  ) => () => void;
};

export const DESKTOP_PROTOCOL = 'sharkord';

export const DESKTOP_ADD_SERVER_ACTION = 'add-server';

export const getDesktopAddServerLink = (serverUrl: string) =>
  `${DESKTOP_PROTOCOL}://${DESKTOP_ADD_SERVER_ACTION}?url=${encodeURIComponent(serverUrl)}`;
