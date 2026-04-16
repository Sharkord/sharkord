import type { TMessageComposeHandle } from '@/components/message-compose';
import { useOwnUserId } from '@/features/server/users/hooks';
import type { TJoinedMessage } from '@sharkord/shared';
import { useCallback, useRef, useState } from 'react';

export const useArrowUpEdit = (messages: TJoinedMessage[]) => {
  const ownUserId = useOwnUserId();
  const composeRef = useRef<TMessageComposeHandle>(null);
  const [editingMessageId, setEditingMessageId] = useState<
    number | undefined
  >();

  const handleArrowUpEdit = useCallback(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.userId === ownUserId && m.editable !== false) {
        setEditingMessageId(m.id);
        return;
      }
    }
  }, [messages, ownUserId]);

  const handleEditComplete = useCallback(() => {
    setEditingMessageId(undefined);
    composeRef.current?.focus();
  }, []);

  return {
    composeRef,
    editingMessageId,
    handleArrowUpEdit,
    handleEditComplete
  };
};
