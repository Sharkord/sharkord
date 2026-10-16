import { MessageAuthorAvatar } from '@/components/message-author-avatar';
import { RelativeTime } from '@/components/relative-time';
import { ThreadRepliesSummary } from '@/components/thread-replies-summary';
import { UnreadCount } from '@/components/unread-count';
import { setSelectedThread } from '@/features/app/actions';
import { useSelectedThread } from '@/features/app/hooks';
import { useThreadReadState } from '@/features/server/threads/hooks';
import { useChannelLabel } from '@/hooks/use-channel-label';
import { cn } from '@/lib/utils';
import {
  getPlainTextFromHtml,
  TestId,
  type TFollowedThread
} from '@sharkord/shared';
import { memo, useCallback, useMemo } from 'react';
import { useMessageAuthorName } from '../../channel-view/text/hooks/use-message-author-name';

type TThreadItemProps = {
  thread: TFollowedThread;
};

const ThreadItem = memo(({ thread }: TThreadItemProps) => {
  const { parentMessageId, channelId } = thread;
  const { unreadCount, hasUnreadMention } = useThreadReadState(parentMessageId);
  const authorName = useMessageAuthorName(thread);
  const channelLabel = useChannelLabel(channelId);
  const selectedThread = useSelectedThread();
  const isSelected = selectedThread?.parentMessageId === parentMessageId;
  const isUnread = unreadCount > 0;

  const snippet = useMemo(
    () => getPlainTextFromHtml(thread.content ?? ''),
    [thread.content]
  );

  const onSelect = useCallback(() => {
    setSelectedThread({ parentMessageId, channelId });
  }, [parentMessageId, channelId]);

  return (
    <button
      type="button"
      data-testid={TestId.THREAD_ITEM}
      onClick={onSelect}
      className={cn(
        'group flex w-full items-start gap-3 rounded-md px-2.5 py-2.5 text-left hover:bg-accent',
        isSelected && 'bg-accent'
      )}
    >
      <MessageAuthorAvatar
        userId={thread.userId}
        pluginId={thread.pluginId}
        className="size-9"
        showStatusBadge={false}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              'truncate text-sm text-foreground',
              isUnread ? 'font-semibold' : 'font-medium'
            )}
          >
            {authorName}
          </span>
          <RelativeTime date={new Date(thread.lastReplyAt)} compact>
            {(relativeTime) => (
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {relativeTime}
              </span>
            )}
          </RelativeTime>
          <UnreadCount
            count={unreadCount}
            hasMention={hasUnreadMention}
            className="ml-0"
          />
        </div>
        <span
          className={cn(
            'truncate text-sm',
            isUnread ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {snippet}
        </span>
        <div className="flex min-w-0 items-center gap-2 pt-0.5 text-xs text-muted-foreground">
          <ThreadRepliesSummary
            replyCount={thread.replyCount}
            replyUserIds={thread.replyUserIds}
            avatarClassName={cn(
              'size-5',
              isSelected ? 'ring-accent' : 'ring-card group-hover:ring-accent'
            )}
          />
          <span className="shrink-0">·</span>
          <span className="truncate">{channelLabel}</span>
        </div>
      </div>
    </button>
  );
});

export { ThreadItem };
