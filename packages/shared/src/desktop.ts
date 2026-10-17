export type TDesktopConfirmOptions = {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'info';
};

export type TDesktopBridge = {
  getServerListVisible: () => Promise<boolean>;
  onServerListVisibleChange: (
    listener: (visible: boolean) => void
  ) => () => void;
  toggleServerList: () => Promise<void>;
  setConfirmationHandler: (
    handler: (options: TDesktopConfirmOptions) => Promise<boolean>
  ) => () => void;
};
