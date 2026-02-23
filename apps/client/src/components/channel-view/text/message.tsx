import { openThreadSidebar } from '@/features/app/actions';
import { useThreadSidebar } from '@/features/app/hooks';
import { useCan } from '@/features/server/hooks';
import { useIsOwnUser } from '@/features/server/users/hooks';
import { cn } from '@/lib/utils';
import { Permission, type TJoinedMessage } from '@sharkord/shared';
import { MessageSquareText } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { MessageActions } from './message-actions';
import { MessageEditInline } from './message-edit-inline';
import { MessageRenderer } from './renderer';

type TMessageProps = {
  message: TJoinedMessage;
};

const Message = memo(({ message, type }: TMessageProps & { type: string }) => {
  const [isEditing, setIsEditing] = useState(false);
  const isFromOwnUser = useIsOwnUser(message.userId);
  const can = useCan();
  const { isOpen: isThreadOpen, parentMessageId: threadParentId } =
    useThreadSidebar();

  const canManage = useMemo(
    () => can(Permission.MANAGE_MESSAGES) || isFromOwnUser,
    [can, isFromOwnUser]
  );

  const isThreadReply = !!message.parentMessageId;
  const replyCount = message.replyCount ?? 0;
  const isActiveThread = isThreadOpen && threadParentId === message.id;

  const onThreadClick = useCallback(() => {
    openThreadSidebar(message.id, message.channelId);
  }, [message.id, message.channelId]);

  return (
    <div
      className={cn(
        'min-w-0 flex-1 ml-1 relative hover:bg-secondary/50 rounded-md px-1 py-0.5 group',
        isActiveThread && 'bg-primary/10'
      )}
    >
      {!isEditing ? (
        <>
          <MessageRenderer message={message} />
          {type === "pinned" ? null : (
          <>
            {!isThreadReply && replyCount > 0 && (
              <button
                type="button"
                onClick={onThreadClick}
                className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary hover:underline mt-1 transition-colors"
              >
                <MessageSquareText className="h-3 w-3" />
                <span>
                  {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                </span>
              </button>
            )}
            <MessageActions
              onEdit={() => setIsEditing(true)}
              canManage={canManage}
              messageId={message.id}
              channelId={message.channelId}
              editable={message.editable ?? false}
              isThreadReply={isThreadReply}
              pinned={message.pinned ?? false}
            />
          </>
        )}
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
