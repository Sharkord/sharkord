import type { TAdminUserInfo } from '@/features/server/admin/hooks';
import type { TFile, TLogin, TMessage, TStorageData } from '@sharkord/shared';
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
  user: TAdminUserInfo;
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
  user: {} as TAdminUserInfo,
  view: undefined,
  setView: () => {},
  links: []
});

const useModViewContext = () => useContext(ModViewContext);

export { ModViewContext, ModViewScreen, useModViewContext };
export type { TModViewContext };
