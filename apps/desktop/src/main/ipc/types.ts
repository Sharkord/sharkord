import type { WebContents } from 'electron';
import type { TServer, TUpdateState } from '../../shared/types';
import type { TServerController } from '../servers/server-controller';

type TIpcContext = {
  controller: TServerController;
  requestRemove: (server: TServer) => Promise<void>;
  togglePerformanceOverlay: () => void;
  toggleMenuBar: () => void;
  getAppFolder: () => string;
  openAppFolder: () => Promise<void>;
  updater: {
    getState: () => TUpdateState;
    check: () => void;
    download: () => void;
    install: () => void;
  };
  // the server views run remote pages, only the shell may manage servers
  isShell: (sender: WebContents) => boolean;
};

export type { TIpcContext };
