import { useTypingUsersByThreadId } from '@/features/server/hooks';
import { useThreadMessages } from '@/features/server/messages/hooks';
import { Spinner } from '@sharkord/ui';
import { MessageSquareText } from 'lucide-react';
import { memo } from 'react';
import { MessagesGroup } from '../channel-view/text/messages-group';
import { useScrollController } from '../channel-view/text/use-scroll-controller';
import { ParentMessagePreview } from './parent-message-preview';
import { ThreadCompose } from './thread-compose';
import { ThreadHeader } from './thread-header';

type TThreadContentProps = {
  parentMessageId: number;
  channelId: number;
};

const ThreadContent = memo(
  ({ parentMessageId, channelId }: TThreadContentProps) => {
    const { messages, hasMore, loadMore, loading, fetching, groupedMessages } =
      useThreadMessages(parentMessageId);

    const typingUsers = useTypingUsersByThreadId(parentMessageId);

    const { containerRef, onScroll } = useScrollController({
      messages,
      fetching,
      hasMore,
      loadMore,
      hasTypingUsers: typingUsers.length > 0
    });

    return (
      <div className="flex flex-col h-full w-full">
        <ThreadHeader />
        <ParentMessagePreview messageId={parentMessageId} />

        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Spinner size="sm" />
            </div>
          ) : (
            <>
              {fetching && (
                <div className="h-8 flex items-center justify-center shrink-0">
                  <Spinner size="xs" />
                </div>
              )}

              <div
                ref={containerRef}
                onScroll={onScroll}
                className="flex-1 overflow-y-auto overflow-x-hidden p-2 animate-in fade-in duration-500"
              >
                {messages.length === 0 && !fetching ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                    <MessageSquareText className="h-8 w-8 mb-2 opacity-50" />
                    <p>No replies yet</p>
                    <p className="text-xs">Be the first to reply</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupedMessages.map((group, index) => (
                      <MessagesGroup key={index} group={group} messageRefs={null} type="thread" />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <ThreadCompose
            parentMessageId={parentMessageId}
            channelId={channelId}
            typingUsers={typingUsers}
          />
        </div>
      </div>
    );
  }
);

export { ThreadContent };
