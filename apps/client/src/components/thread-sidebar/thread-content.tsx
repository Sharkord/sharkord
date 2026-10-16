import { markThreadAsRead } from '@/features/server/threads/actions';
import { useThreadReadState } from '@/features/server/threads/hooks';
import { TestId } from '@sharkord/shared';
import { MessageSquareText } from 'lucide-react';
import { memo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Conversation } from '../channel-view/text/conversation';
import { ParentMessagePreview } from './parent-message-preview';
import { ThreadHeader } from './thread-header';

type TThreadContentProps = {
  parentMessageId: number;
  channelId: number;
  onClose: () => void;
};

const ThreadContent = memo(
  ({ parentMessageId, channelId, onClose }: TThreadContentProps) => {
    const { t } = useTranslation('common');
    const { unreadCount } = useThreadReadState(parentMessageId);

    useEffect(() => {
      if (unreadCount > 0 && !document.hidden) {
        markThreadAsRead(parentMessageId);
      }
    }, [unreadCount, parentMessageId]);

    const renderHeader = useCallback(
      () => (
        <>
          <ThreadHeader
            parentMessageId={parentMessageId}
            channelId={channelId}
            onClose={onClose}
          />
          <ParentMessagePreview
            messageId={parentMessageId}
            channelId={channelId}
          />
        </>
      ),
      [parentMessageId, channelId, onClose]
    );

    return (
      <div
        data-testid={TestId.THREAD_VIEW}
        className="relative flex h-full min-h-0 w-full flex-col"
      >
        <Conversation
          channelId={channelId}
          parentMessageId={parentMessageId}
          renderHeader={renderHeader}
          emptyState={
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
              <MessageSquareText className="h-8 w-8 mb-2 opacity-50" />
              <p>{t('noRepliesYet')}</p>
              <p className="text-xs">{t('beFirstToReply')}</p>
            </div>
          }
        />
      </div>
    );
  }
);

export { ThreadContent };
