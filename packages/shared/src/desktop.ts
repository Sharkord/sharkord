import type { TAppNotification, TNotificationTarget } from './notifications';

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

export type TDesktopHotkeyPhase = 'down' | 'up';

// systemManaged: the desktop environment owns the keys (wayland), the user approves and
// changes them in its own settings
export type TDesktopHotkeyCapabilities = {
  keyUp: boolean;
  systemManaged: boolean;
};

export type TDesktopHotkeyError = {
  actionId: string;
  reason: 'unsupported' | 'needs-modifier' | 'taken' | 'declined';
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
  setVoiceActive: (active: boolean) => void;
  startSystemAudio: () => Promise<boolean>;
  stopSystemAudio: () => Promise<void>;
  showNotification: (notification: TAppNotification) => void;
  setHotkeys: (
    bindings: TDesktopHotkeyBinding[]
  ) => Promise<TDesktopHotkeyError[]>;
  getHotkeyCapabilities: () => Promise<TDesktopHotkeyCapabilities>;
  onHotkey: (
    listener: (actionId: string, phase: TDesktopHotkeyPhase) => void
  ) => () => void;
  onHotkeyErrors: (
    listener: (errors: TDesktopHotkeyError[]) => void
  ) => () => void;
  onNotificationClick: (
    listener: (target: TNotificationTarget) => void
  ) => () => void;
};

// must match exactly between the desktop app and a server's client
// this will be changed in the future for a better versioning scheme
export const DESKTOP_BRIDGE_VERSION = 1;

// this should NEVER change, it is how every client and desktop app of any version find
export type TDesktopEntry = {
  version: number;
  connect: (clientVersion: number) => TDesktopBridge | undefined;
};

// server-outdated: the server's client is older than the desktop app,
// app-outdated: the desktop app is older than the server's client
export const DESKTOP_MISMATCHES = ['server-outdated', 'app-outdated'] as const;

export type TDesktopMismatch = (typeof DESKTOP_MISMATCHES)[number];

export const getDesktopMismatch = (
  desktopVersion: number,
  clientVersion: number
): TDesktopMismatch | undefined => {
  if (clientVersion < desktopVersion) {
    return 'server-outdated';
  }

  if (clientVersion > desktopVersion) {
    return 'app-outdated';
  }

  return undefined;
};

export const DESKTOP_PROTOCOL = 'sharkord';

export const DESKTOP_ADD_SERVER_ACTION = 'add-server';

export const getDesktopAddServerLink = (serverUrl: string) =>
  `${DESKTOP_PROTOCOL}://${DESKTOP_ADD_SERVER_ACTION}?url=${encodeURIComponent(serverUrl)}`;
