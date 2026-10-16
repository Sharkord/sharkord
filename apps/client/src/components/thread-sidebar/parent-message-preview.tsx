import { MessageAuthorAvatar } from '@/components/message-author-avatar';
import { useParentMessage } from '@/features/server/messages/hooks';
import type { TJoinedMessage } from '@sharkord/shared';
import { Spinner } from '@sharkord/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMessageAuthorName } from '../channel-view/text/hooks/use-message-author-name';
import { MessageRenderer } from '../channel-view/text/renderer';

type TParentMessageContentProps = {
  parentMessage: TJoinedMessage;
};

const ParentMessageContent = memo(
  ({ parentMessage }: TParentMessageContentProps) => {
    const authorName = useMessageAuthorName(parentMessage);

    return (
      <div className="px-4 py-3 border-b border-border bg-secondary/30 max-h-64 overflow-auto">
        <div className="flex items-center gap-2 mb-1">
          <MessageAuthorAvatar
            userId={parentMessage.userId}
            pluginId={parentMessage.pluginId}
            className="h-8 w-8"
            showUserPopover
          />
          <span className="text-sm font-medium">{authorName}</span>
        </div>
        <div className="text-sm opacity-80">
          <MessageRenderer message={parentMessage} />
        </div>
      </div>
    );
  }
);

type TParentMessagePreviewProps = {
  messageId: number;
  channelId: number;
};

const ParentMessagePreview = memo(
  ({ messageId, channelId }: TParentMessagePreviewProps) => {
    const { t } = useTranslation('common');
    const parentMessage = useParentMessage(messageId, channelId);

    if (!parentMessage) {
      return (
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <Spinner size="xs" />
          <span className="text-sm text-muted-foreground">
            {t('loadingMessage')}
          </span>
        </div>
      );
    }

    return <ParentMessageContent parentMessage={parentMessage} />;
  }
);

export { ParentMessagePreview };
