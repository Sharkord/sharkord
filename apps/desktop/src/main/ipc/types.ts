import type { TServer } from '../../shared/types';
import type { TServerController } from '../servers/server-controller';

type TIpcContext = {
  controller: TServerController;
  requestRemove: (server: TServer) => Promise<void>;
};

export type { TIpcContext };
