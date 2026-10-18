import type { TDesktopUnreadState } from '@sharkord/shared';

type TServer = {
  id: string;
  name: string;
  url: string;
  iconUrl: string | null;
};

type TServersState = {
  servers: TServer[];
  selectedId: string | null;
  adding: boolean;
  railVisible: boolean;
  unread: Record<string, TDesktopUnreadState>;
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
  TPerformanceOverlayApi,
  TProcessGroup,
  TProcessUsage,
  TServer,
  TServersState
};
