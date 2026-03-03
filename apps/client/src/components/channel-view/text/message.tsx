import { openThreadSidebar } from '@/features/app/actions';
import { useThreadSidebar } from '@/features/app/hooks';
import { useCan } from '@/features/server/hooks';
import {
  useIsOwnUser,
  useOwnUserId,
  useUserById
} from '@/features/server/users/hooks';
import { cn } from '@/lib/utils';
import { Permission, type TJoinedMessage } from '@sharkord/shared';
import { CornerUpRight, MessageSquareText } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { MessageActions } from './message-actions';
import { MessageEditInline } from './message-edit-inline';
import { MessageRenderer } from './renderer';

type TMessageProps = {
  message: TJoinedMessage;
  disableActions?: boolean;
  disableFiles?: boolean;
  disableReactions?: boolean;
  onReply?: (message: TJoinedMessage) => void;
  onScrollToMessage?: (messageId: number) => void;
};

const Message = memo(
  ({
    message,
    disableActions,
    disableFiles,
    disableReactions,
    onReply,
    onScrollToMessage
  }: TMessageProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const isFromOwnUser = useIsOwnUser(message.userId);
    const ownUserId = useOwnUserId();
    const can = useCan();
    const { isOpen: isThreadOpen, parentMessageId: threadParentId } =
      useThreadSidebar();

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

    const isThreadReply = !!message.parentMessageId;
    const replyCount = message.replyCount ?? 0;
    const isActiveThread = isThreadOpen && threadParentId === message.id;

    const replyToUser = useUserById(message.replyTo?.userId ?? -1);

    const onThreadClick = useCallback(() => {
      openThreadSidebar(message.id, message.channelId);
    }, [message.id, message.channelId]);

    const handleReply = useCallback(() => {
      onReply?.(message);
    }, [onReply, message]);

    const handleReplyPreviewClick = useCallback(() => {
      if (message.replyTo?.id && onScrollToMessage) {
        onScrollToMessage(message.replyTo.id);
      }
    }, [message.replyTo?.id, onScrollToMessage]);

    return (
      <div
        className={cn(
          'min-w-0 flex-1 ml-1 relative hover:bg-secondary/50 rounded-md px-1 py-0.5 group',
          isActiveThread && 'bg-primary/10',
          isMentioned && 'border-l-2 border-primary bg-primary/5'
        )}
        data-message-id={message.id}
      >
        {!isEditing ? (
          <>
            {message.replyTo && (
              <button
                type="button"
                onClick={handleReplyPreviewClick}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-0.5 max-w-full truncate transition-colors"
              >
                <CornerUpRight className="h-3 w-3 shrink-0" />
                <span className="font-medium shrink-0">
                  {replyToUser?.name ?? 'Unknown'}
                </span>
                <span className="truncate opacity-70">
                  {message.replyTo.content
                    ? message.replyTo.content.replace(/<[^>]*>/g, '').slice(0, 100)
                    : 'Click to see message'}
                </span>
              </button>
            )}
            <MessageRenderer
              message={message}
              disableFiles={disableFiles}
              disableReactions={disableReactions}
            />
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
            {!disableActions && (
              <MessageActions
                onEdit={() => setIsEditing(true)}
                onReply={onReply ? handleReply : undefined}
                canManage={canManage}
                messageId={message.id}
                channelId={message.channelId}
                editable={message.editable ?? false}
                isPinned={message.pinned ?? false}
                disablePin={!!message.parentMessageId}
                isThreadReply={isThreadReply}
              />
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
  }
);

export { Message };
