import { useState, type ReactNode } from 'react';
import { PinnedMessageContext } from './pinned-message-context';

export const PinnedMessageProvider = ({
  children
}: {
  children: ReactNode;
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <PinnedMessageContext.Provider value={{ visible, setVisible }}>
      {children}
    </PinnedMessageContext.Provider>
  );
};
