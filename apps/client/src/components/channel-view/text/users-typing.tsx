import { TypingDots } from '@/components/typing-dots';
import { useTypingUsersByChannelId } from '@/features/server/hooks';
import type { TJoinedPublicUser } from '@sharkord/shared';
import { memo } from 'react';

type TUsersTypingIndicatorProps = {
  typingUsers: TJoinedPublicUser[];
};

const UsersTypingIndicator = memo(
  ({ typingUsers }: TUsersTypingIndicatorProps) => {
    return (
      <div className="h-2 flex items-center gap-1 text-xs text-muted-foreground px-1">
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2">
            <TypingDots className="[&>div]:w-0.5 [&>div]:h-0.5" />
            <span>
              {typingUsers.length === 1
                ? `${typingUsers[0].name} is typing...`
                : typingUsers.length === 2
                  ? `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`
                  : `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing...`}
            </span>
          </div>
        )}
      </div>
    );
  }
);

type TUsersTypingProps = {
  channelId: number;
};

const UsersTyping = memo(({ channelId }: TUsersTypingProps) => {
  const typingUsers = useTypingUsersByChannelId(channelId);

  return <UsersTypingIndicator typingUsers={typingUsers} />;
});

export { UsersTyping, UsersTypingIndicator };
