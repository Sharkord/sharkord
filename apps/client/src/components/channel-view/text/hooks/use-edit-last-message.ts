import { useOwnUserId } from '@/features/server/users/hooks';
import type { TJoinedMessage } from '@sharkord/shared';
import { useCallback, useState, type RefObject } from 'react';

type TUseEditLastMessageReturn = {
  editingMessageId: number | undefined;
  onEditLastMessage: () => void;
  onCancelEdit: () => void;
  startEdit: (messageId: number) => void;
};

const useEditLastMessage = (
  messages: TJoinedMessage[],
  composeRef: RefObject<{ focus: () => void } | null>
): TUseEditLastMessageReturn => {
  const [editingMessageId, setEditingMessageId] = useState<
    number | undefined
  >();
  const ownUserId = useOwnUserId();

  const onEditLastMessage = useCallback(() => {
    const lastOwnMessage = [...messages]
      .reverse()
      .find((m) => m.userId === ownUserId && m.editable);

    if (lastOwnMessage) {
      setEditingMessageId(lastOwnMessage.id);
    }
  }, [messages, ownUserId]);

  const onCancelEdit = useCallback(() => {
    setEditingMessageId(undefined);
    composeRef.current?.focus();
  }, [composeRef]);

  const startEdit = useCallback((messageId: number) => {
    setEditingMessageId(messageId);
  }, []);

  return { editingMessageId, onEditLastMessage, onCancelEdit, startEdit };
};

export { useEditLastMessage };
