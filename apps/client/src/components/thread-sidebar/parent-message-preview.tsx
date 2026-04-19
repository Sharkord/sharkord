import { PluginAvatar } from '@/components/plugin-avatar';
import { useThreadSidebar } from '@/features/app/hooks';
import { useParentMessage } from '@/features/server/messages/hooks';
import { usePluginMetadata } from '@/features/server/plugins/hooks';
import type { TJoinedMessage } from '@sharkord/shared';
import { Spinner } from '@sharkord/ui';
import { memo } from 'react';
import { useMessageAuthorName } from '../channel-view/text/hooks/use-message-author-name';
import { MessageRenderer } from '../channel-view/text/renderer';
import { UserAvatar } from '../user-avatar';

type TParentMessageContentProps = {
  parentMessage: TJoinedMessage;
};

const ParentMessageContent = memo(
  ({ parentMessage }: TParentMessageContentProps) => {
    const pluginMetadata = usePluginMetadata(parentMessage.pluginId);
    const isPluginMessage = !!parentMessage.pluginId;
    const authorName = useMessageAuthorName(parentMessage);

    return (
      <div className="px-4 py-3 border-b border-border bg-secondary/30 max-h-64 overflow-auto">
        <div className="flex items-center gap-2 mb-1">
          {isPluginMessage ? (
            <PluginAvatar
              name={pluginMetadata?.name}
              avatarUrl={pluginMetadata?.avatarUrl}
              className="h-8 w-8"
            />
          ) : (
            <UserAvatar
              userId={parentMessage.userId}
              className="h-8 w-8"
              showUserPopover
            />
          )}
          <span className="text-sm font-medium">{authorName}</span>
        </div>
        <div className="text-sm line-clamp-3 opacity-80">
          <MessageRenderer message={parentMessage} />
        </div>
      </div>
    );
  }
);

type TParentMessagePreviewProps = {
  messageId: number;
};

const ParentMessagePreview = memo(
  ({ messageId }: TParentMessagePreviewProps) => {
    const { channelId } = useThreadSidebar();
    const parentMessage = useParentMessage(messageId, channelId);

    if (!parentMessage) {
      return (
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <Spinner size="xs" />
          <span className="text-sm text-muted-foreground">
            Loading message...
          </span>
        </div>
      );
    }

    return <ParentMessageContent parentMessage={parentMessage} />;
  }
);

export { ParentMessagePreview };
