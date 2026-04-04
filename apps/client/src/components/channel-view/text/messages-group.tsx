import { PluginAvatar } from '@/components/plugin-avatar';
import { RelativeTime } from '@/components/relative-time';
import { UserAvatar } from '@/components/user-avatar';
import { usePluginMetadata } from '@/features/server/plugins/hooks';
import { useIsOwnUser, useUserById } from '@/features/server/users/hooks';
import { cn } from '@/lib/utils';
import {
  DELETED_USER_IDENTITY_AND_NAME,
  type TJoinedMessage
} from '@sharkord/shared';
import { format } from 'date-fns';
import { memo } from 'react';
import { useMessageAuthorName } from './hooks/use-message-author-name';
import { Message } from './message';
import { MessageReplyPreviewWrapper } from './message-reply-preview-wrapper';

type TMessagesGroupProps = {
  group: TJoinedMessage[];
  disableActions?: boolean;
  disableFiles?: boolean;
  disableReactions?: boolean;
  onReplyMessageSelect?: (message: TJoinedMessage) => void;
  replyTargetMessageId?: number;
};

const MessagesGroup = memo(
  ({
    group,
    disableActions,
    disableFiles,
    disableReactions,
    onReplyMessageSelect,
    replyTargetMessageId
  }: TMessagesGroupProps) => {
    const firstMessage = group[0];
    const pluginMetadata = usePluginMetadata(firstMessage.pluginId);
    const user = useUserById(firstMessage.userId);
    const date = new Date(firstMessage.createdAt);
    const isOwnUser = useIsOwnUser(firstMessage.userId);
    const authorName = useMessageAuthorName(firstMessage);
    const isDeletedUser = user?.name === DELETED_USER_IDENTITY_AND_NAME;
    const isPluginMessage = !!firstMessage.pluginId;

    const isReplyToMessage =
      group.length === 1 && !!firstMessage.replyToMessageId;

    const groupContent = (
      <div className="flex min-w-0 max-w-dvw gap-1 pl-2 pt-2 pr-2">
        {isPluginMessage ? (
          <PluginAvatar
            name={pluginMetadata?.name}
            avatarUrl={pluginMetadata?.avatarUrl}
            className="h-10 w-10"
          />
        ) : (
          <UserAvatar userId={user!.id} className="h-10 w-10" showUserPopover />
        )}
        <div className="flex min-w-0 flex-col w-full">
          <div className="flex gap-2 items-baseline pl-1 select-none">
            <span
              className={cn(
                isOwnUser && 'font-bold',
                isDeletedUser && 'line-through text-muted-foreground',
                isPluginMessage && 'text-primary/80'
              )}
            >
              {authorName}
            </span>
            {isPluginMessage && (
              <span className="inline-flex items-center rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary/60 uppercase tracking-wide">
                bot
              </span>
            )}
            <RelativeTime date={date}>
              {(relativeTime) => (
                <span
                  className="text-primary/60 text-xs"
                  title={format(date, 'PPpp')}
                >
                  {relativeTime}
                </span>
              )}
            </RelativeTime>
          </div>
          <div className="flex min-w-0 flex-col">
            {group.map((message) => (
              <div
                key={message.id}
                id={`message-${message.id}`}
                className="rounded-md transition-colors duration-1000"
              >
                <Message
                  message={message}
                  disableActions={disableActions}
                  disableFiles={disableFiles}
                  disableReactions={disableReactions}
                  onReplyMessageSelect={onReplyMessageSelect}
                  isInlineReplyTarget={message.id === replyTargetMessageId}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );

    if (isReplyToMessage) {
      return (
        <MessageReplyPreviewWrapper message={firstMessage}>
          {groupContent}
        </MessageReplyPreviewWrapper>
      );
    }

    return groupContent;
  }
);

export { MessagesGroup };
