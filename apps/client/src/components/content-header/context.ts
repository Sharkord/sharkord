import { createContext, useContext } from 'react';

type TMainContentContext = {
  onOpenChannelList: () => void;
  onToggleMembers: () => void;
  isMembersOpen: boolean;
};

const MainContentContext = createContext<TMainContentContext | undefined>(
  undefined
);

const useMainContent = () => useContext(MainContentContext);

export { MainContentContext, useMainContent };
export type { TMainContentContext };
