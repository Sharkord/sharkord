import { useCan } from '@/features/server/hooks';
import { useIsOwnUser } from '@/features/server/users/hooks';
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
  const can = useCan();

  const canManage = useMemo(
    () => can(Permission.MANAGE_MESSAGES) || isFromOwnUser,
    [can, isFromOwnUser]
  );

  return (
    <div className="min-w-0 flex-1 ml-1 relative hover:bg-secondary/50 rounded-md px-1 py-0.5 group">
      {!isEditing ? (
        <>
          <MessageRenderer message={message} />
          <MessageActions
            onEdit={() => setIsEditing(true)}
            canManage={canManage}
            messageId={message.id}
            editable={message.editable ?? false}
            bool_pinned={message.bool_pinned ?? false}
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
