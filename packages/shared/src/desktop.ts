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

export type TDesktopBridge = {
  getServerListVisible: () => Promise<boolean>;
  onServerListVisibleChange: (
    listener: (visible: boolean) => void
  ) => () => void;
  toggleServerList: () => Promise<void>;
  openSettings: () => Promise<void>;
  setUnreadState: (state: TDesktopUnreadState) => void;
  setConnectionState: (state: TDesktopConnectionState) => void;
  setConfirmationHandler: (
    handler: (options: TDesktopConfirmOptions) => Promise<boolean>
  ) => () => void;
};
