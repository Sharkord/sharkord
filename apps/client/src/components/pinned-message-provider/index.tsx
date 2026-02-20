import { createContext, useState, type ReactNode } from 'react';

  type PinnedMessageContextType = {
    visible: boolean;
    setVisible: (v: boolean) => void;
  };

  export const PinnedMessageContext = createContext<PinnedMessageContextType | undefined>(undefined);

  export const PinnedMessageProvider = ({ children }: { children: ReactNode }) => {
    const [visible, setVisible] = useState(false);

    return (
      <PinnedMessageContext.Provider value={{ visible, setVisible }}>
        {children}
      </PinnedMessageContext.Provider>
    );
  };