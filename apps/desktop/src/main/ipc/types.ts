import type { WebContents } from 'electron';
import type { TServer } from '../../shared/types';
import type { TServerController } from '../servers/server-controller';

type TIpcContext = {
  controller: TServerController;
  requestRemove: (server: TServer) => Promise<void>;
  // the server views run remote pages, only the shell may manage servers
  isShell: (sender: WebContents) => boolean;
};

export type { TIpcContext };
