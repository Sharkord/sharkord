import { createContext } from 'react';

export type PinnedMessageContextType = {
  visible: boolean;
  setVisible: (v: boolean) => void;
};

export const PinnedMessageContext = createContext<PinnedMessageContextType>({
  visible: false,
  setVisible: () => {}
});
