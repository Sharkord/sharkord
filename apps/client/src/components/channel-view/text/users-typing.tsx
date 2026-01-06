import { TypingDots } from '@/components/typing-dots';
import { useTypingUsersByChannelId } from '@/features/server/hooks';
import { memo } from 'react';

type TUsersTypingProps = {
  channelId: number;
};

const UsersTyping = memo(({ channelId }: TUsersTypingProps) => {
  const typingUsers = useTypingUsersByChannelId(channelId);

  if (typingUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground px-1">
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
    </div>
  );
});

export { UsersTyping };
