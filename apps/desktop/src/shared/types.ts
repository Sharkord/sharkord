import type {
  TDesktopConnectionState,
  TDesktopUnreadState
} from '@sharkord/shared';

type TServer = {
  id: string;
  name: string;
  url: string;
  iconUrl: string | null;
};

type TServerStatus = 'idle' | 'error' | TDesktopConnectionState;

type TDesktopSettings = {
  connectAllOnStartup: boolean;
  throttleHiddenServers: boolean;
  autoStart: boolean;
  startToTray: boolean;
};

type TServersState = {
  servers: TServer[];
  selectedId: string | null;
  adding: boolean;
  pendingAddress: string | null;
  settingsOpen: boolean;
  settings: TDesktopSettings;
  railVisible: boolean;
  unread: Record<string, TDesktopUnreadState>;
  statuses: Record<string, TServerStatus>;
};

type TAddServerError = 'invalid-url' | 'unreachable' | 'duplicate';

type TDesktopApi = {
  getState: () => Promise<TServersState>;
  onStateChange: (listener: (state: TServersState) => void) => () => void;
  addServer: (input: string) => Promise<TAddServerError | null>;
  removeServer: (id: string) => Promise<void>;
  setOverlay: (open: boolean) => Promise<void>;
  selectServer: (id: string) => Promise<void>;
  setAdding: (adding: boolean) => Promise<void>;
  setRailHidden: (hidden: boolean) => Promise<void>;
  setSettingsOpen: (open: boolean) => Promise<void>;
  updateSettings: (settings: Partial<TDesktopSettings>) => Promise<void>;
  togglePerformanceOverlay: () => Promise<void>;
  toggleMenuBar: () => Promise<void>;
};

type TProcessGroup = 'Main' | 'Renderer' | 'GPU' | 'Utility' | 'Other';

type TProcessUsage = {
  group: TProcessGroup;
  count: number;
  memoryKb: number;
  cpuPercent: number;
};

type TPerformanceOverlayApi = {
  onUpdate: (listener: (usage: TProcessUsage[]) => void) => () => void;
};

export type {
  TAddServerError,
  TDesktopApi,
  TDesktopSettings,
  TPerformanceOverlayApi,
  TProcessGroup,
  TProcessUsage,
  TServer,
  TServersState,
  TServerStatus
};
