import { DEFAULT_MAX_HEIGHT_VH } from '@/components/message-compose';
import { useTypingUsersByThreadId } from '@/features/server/hooks';
import { useThreadMessages } from '@/features/server/messages/hooks';
import { LocalStorageKey } from '@/helpers/storage';
import type { TJoinedMessage } from '@sharkord/shared';
import { Spinner } from '@sharkord/ui';
import { MessageSquareText } from 'lucide-react';
import { memo, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatInputDivider } from '../channel-view/text/chat-input-divider';
import { useScrollController } from '../channel-view/text/hooks/use-scroll-controller';
import { MessagesGroup } from '../channel-view/text/messages-group';
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
    const composeContainerRef = useRef<HTMLDivElement>(null);

    const {
      containerRef,
      onScroll,
      onAsyncContentLoaded,
      scrollToBottom,
      isAtBottom
    } = useScrollController({
      messages,
      fetching,
      hasMore,
      loadMore,
      hasTypingUsers: typingUsers.length > 0
    });

    const onComposeResize = useCallback(() => {
      if (isAtBottom()) {
        scrollToBottom();
      }
    }, [isAtBottom, scrollToBottom]);

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

              <div
                ref={containerRef}
                onScroll={onScroll}
                onLoadCapture={onAsyncContentLoaded}
                className="flex-1 overflow-y-auto overflow-x-hidden p-2 animate-in fade-in duration-500"
              >
                {messages.length === 0 && !fetching ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                    <MessageSquareText className="h-8 w-8 mb-2 opacity-50" />
                    <p>{t('noRepliesYet')}</p>
                    <p className="text-xs">{t('beFirstToReply')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupedMessages.map((group, index) => (
                      <MessagesGroup
                        key={index}
                        group={group}
                        onReplyMessageSelect={onReplyMessageSelect}
                        replyTargetMessageId={replyingToMessage?.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <ChatInputDivider
            composeContainerRef={composeContainerRef}
            scrollToBottom={scrollToBottom}
            isAtBottom={isAtBottom}
            storageKey={LocalStorageKey.THREAD_INPUT_HEIGHT_VH}
            defaultMaxHeightVh={DEFAULT_MAX_HEIGHT_VH}
          />

          <ThreadCompose
            parentMessageId={parentMessageId}
            channelId={channelId}
            typingUsers={typingUsers}
            replyingToMessage={replyingToMessage}
            onCancelReply={() => setReplyingToMessage(undefined)}
            composeContainerRef={composeContainerRef}
            inputStorageKey={LocalStorageKey.THREAD_INPUT_HEIGHT_VH}
            inputDefaultMaxHeightVh={DEFAULT_MAX_HEIGHT_VH}
            onResize={onComposeResize}
          />
        </div>
      </div>
    );
  }
);

export { ThreadContent };
