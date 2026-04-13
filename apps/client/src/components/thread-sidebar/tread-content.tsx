import { useTypingUsersByThreadId } from '@/features/server/hooks';
import { useThreadMessages } from '@/features/server/messages/hooks';
import type { TJoinedMessage } from '@sharkord/shared';
import { Spinner } from '@sharkord/ui';
import { MessageSquareText } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { VirtualizedMessagesList } from '../channel-view/text/virtualized-messages-list';
import { ParentMessagePreview } from './parent-message-preview';
import { ThreadCompose } from './thread-compose';
import { ThreadHeader } from './thread-header';

type TThreadContentProps = {
  parentMessageId: number;
  channelId: number;
};

const ThreadContent = memo(
  ({ parentMessageId, channelId }: TThreadContentProps) => {
    const { t } = useTranslation('common');
    const { messages, hasMore, loadMore, loading, fetching, groupedMessages } =
      useThreadMessages(parentMessageId);
    const [replyingToMessage, setReplyingToMessage] = useState<
      TJoinedMessage | undefined
    >();

    const typingUsers = useTypingUsersByThreadId(parentMessageId);

    const onReplyMessageSelect = useCallback((message: TJoinedMessage) => {
      setReplyingToMessage(message);
    }, []);

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

              {messages.length === 0 && !fetching ? (
                <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground text-sm">
                  <MessageSquareText className="h-8 w-8 mb-2 opacity-50" />
                  <p>{t('noRepliesYet')}</p>
                  <p className="text-xs">{t('beFirstToReply')}</p>
                </div>
              ) : (
                <VirtualizedMessagesList
                  groups={groupedMessages}
                  hasMore={hasMore}
                  fetching={fetching}
                  loadMore={loadMore}
                  onReplyMessageSelect={onReplyMessageSelect}
                  replyTargetMessageId={replyingToMessage?.id}
                />
              )}
            </>
          )}

          <ThreadCompose
            parentMessageId={parentMessageId}
            channelId={channelId}
            typingUsers={typingUsers}
            replyingToMessage={replyingToMessage}
            onCancelReply={() => setReplyingToMessage(undefined)}
          />
        </div>
      </div>
    );
  }
);

export { ThreadContent };
