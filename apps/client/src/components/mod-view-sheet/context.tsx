import type {
  TFile,
  TJoinedUser,
  TLogin,
  TMessage,
  TStorageData
} from '@sharkord/shared';
import { createContext, useContext } from 'react';

enum ModViewScreen {
  FILES = 'FILES',
  MESSAGES = 'MESSAGES',
  LINKS = 'LINKS',
  LOGINS = 'LOGINS'
}

type TModViewContext = {
  refetch: () => void;
  userId: number;
  user: TJoinedUser;
  logins: TLogin[];
  files: TFile[];
  storage: TStorageData & { quota: number };
  messages: TMessage[];
  view: ModViewScreen | undefined;
  setView: (view: ModViewScreen | undefined) => void;
  links: string[];
};

const ModViewContext = createContext<TModViewContext>({
  refetch: () => {},
  userId: -1,
  logins: [],
  files: [],
  storage: {
    userId: -1,
    fileCount: 0,
    usedStorage: 0,
    quota: 0
  },
  messages: [],
  user: {} as TJoinedUser,
  view: undefined,
  setView: () => {},
  links: []
});

const useModViewContext = () => useContext(ModViewContext);

export { ModViewContext, ModViewScreen, useModViewContext };
export type { TModViewContext };
