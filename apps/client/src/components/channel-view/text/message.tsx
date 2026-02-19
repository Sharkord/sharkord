import { useCan } from '@/features/server/hooks';
import { useIsOwnUser, useOwnUserId } from '@/features/server/users/hooks';
import { cn } from '@/lib/utils';
import { Permission, type TJoinedMessage } from '@sharkord/shared';
import { memo, useMemo, useState } from 'react';
import { MessageActions } from './message-actions';
import { MessageEditInline } from './message-edit-inline';
import { MessageRenderer } from './renderer';

type TMessageProps = {
  message: TJoinedMessage;
};

const Message = memo(({ message }: TMessageProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const isFromOwnUser = useIsOwnUser(message.userId);
  const ownUserId = useOwnUserId();
  const can = useCan();

  const canManage = useMemo(
    () => can(Permission.MANAGE_MESSAGES) || isFromOwnUser,
    [can, isFromOwnUser]
  );

  const isMentioned = useMemo(
    () =>
      ownUserId != null &&
      message.content?.includes(`data-user-id="${ownUserId}"`),
    [message.content, ownUserId]
  );

  return (
    <div
      className={cn(
        'min-w-0 flex-1 ml-1 relative hover:bg-secondary/50 rounded-md px-1 py-0.5 group',
        isMentioned && 'border-l-2 border-primary bg-primary/5'
      )}
    >
      {!isEditing ? (
        <>
          <MessageRenderer message={message} />
          <MessageActions
            onEdit={() => setIsEditing(true)}
            canManage={canManage}
            messageId={message.id}
            editable={message.editable ?? false}
          />
        </>
      ) : (
        <MessageEditInline
          message={message}
          onBlur={() => setIsEditing(false)}
        />
      )}
    </div>
  );
});

export { Message };
