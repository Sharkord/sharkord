import { useThreadSidebar } from '@/features/app/hooks';
import { useParentMessage } from '@/features/server/messages/hooks';
import { useUserById } from '@/features/server/users/hooks';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import type { TJoinedMessage } from '@sharkord/shared';
import { memo } from 'react';
import { MessageRenderer } from '../channel-view/text/renderer';
import { UserAvatar } from '../user-avatar';

type TParentMessageContentProps = {
  parentMessage: TJoinedMessage;
};

const ParentMessageContent = memo(
  ({ parentMessage }: TParentMessageContentProps) => {
    const user = useUserById(parentMessage.userId);

    if (!user) {
      return null;
    }

    return (
      <>
        <div className="px-4 py-3 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2 mb-1">
            <UserAvatar userId={parentMessage.userId} className="h-5 w-5" />
            <span className="text-sm font-medium">
              {getRenderedUsername(user)}
            </span>
          </div>
          <div className="text-sm line-clamp-3 opacity-80">
            <MessageRenderer message={parentMessage} />
          </div>
        </div>
      </>
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
        <div className="px-4 py-3 border-b border-border bg-secondary/30">
          <div className="text-sm text-muted-foreground">
            Loading message...
          </div>
        </div>
      );
    }

    return <ParentMessageContent parentMessage={parentMessage} />;
  }
);

export { ParentMessagePreview };
