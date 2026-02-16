import { TypingDots } from '@/components/typing-dots';
import { UserName } from '@/components/user-name';
import { useTypingUsersByChannelId } from '@/features/server/hooks';
import { memo } from 'react';

type TUsersTypingProps = {
  channelId: number;
};

const UsersTyping = memo(({ channelId }: TUsersTypingProps) => {
  const typingUsers = useTypingUsersByChannelId(channelId);
  const firstTypingUser = typingUsers[0];
  const secondTypingUser = typingUsers[1];

  if (!firstTypingUser) {
    return null;
  }
  if (typingUsers.length === 2 && !secondTypingUser) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground px-1">
      <div className="flex items-center gap-2">
        <TypingDots className="[&>div]:w-0.5 [&>div]:h-0.5" />
        <span>
          {typingUsers.length === 1
            ? (
                <>
                  <UserName
                    userId={firstTypingUser.id}
                    name={firstTypingUser.name}
                    banned={firstTypingUser.banned}
                  />{' '}
                  is typing...
                </>
              )
            : typingUsers.length === 2
              ? (
                  <>
                    <UserName
                      userId={firstTypingUser.id}
                      name={firstTypingUser.name}
                      banned={firstTypingUser.banned}
                    />{' '}
                    and{' '}
                    <UserName
                      userId={secondTypingUser.id}
                      name={secondTypingUser.name}
                      banned={secondTypingUser.banned}
                    />{' '}
                    are typing...
                  </>
                )
              : (
                  <>
                    <UserName
                      userId={firstTypingUser.id}
                      name={firstTypingUser.name}
                      banned={firstTypingUser.banned}
                    />{' '}
                    and {typingUsers.length - 1} others are typing...
                  </>
                )}
        </span>
      </div>
    </div>
  );
});

export { UsersTyping };
