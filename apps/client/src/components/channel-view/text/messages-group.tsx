import { RelativeTime } from '@/components/relative-time';
import { UserAvatar } from '@/components/user-avatar';
import { useIsOwnUser, useUserById } from '@/features/server/users/hooks';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { cn } from '@/lib/utils';
import {
  DELETED_USER_IDENTITY_AND_NAME,
  type TJoinedMessage
} from '@sharkord/shared';
import { format } from 'date-fns';
import { memo } from 'react';
import { Message } from './message';
import { Button } from '@sharkord/ui';

type TMessagesGroupProps = {
  group: TJoinedMessage[];
};

const MessagesGroup = memo(({ group, messageRefs, pinnedMessages = false }: TMessagesGroupProps & { messageRefs: any, pinnedMessages?: boolean }) => {
  const firstMessage = group[0];
  const user = useUserById(firstMessage.userId);
  const date = new Date(firstMessage.createdAt);
  const isOwnUser = useIsOwnUser(firstMessage.userId);
  const isDeletedUser = user?.name === DELETED_USER_IDENTITY_AND_NAME;

  if (!user) return null;

  function scrollToMessage(id: number) {
    const el = messageRefs.current[id];
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <div className="flex min-w-0 max-w-dvw gap-1 pl-2 pt-2 pr-2">
      <UserAvatar userId={user.id} className="h-10 w-10" showUserPopover />
      <div className="flex min-w-0 flex-col w-full">
        <div className="flex gap-2 items-baseline pl-1 select-none">
          <span
            className={cn(
              isOwnUser && 'font-bold',
              isDeletedUser && 'line-through text-muted-foreground'
            )}
          >
            {getRenderedUsername(user)}
          </span>
          <RelativeTime date={date}>
            {(relativeTime) => (
              <span
                className="text-primary/60 text-xs"
                title={format(date, 'PPpp')}
              >
                {relativeTime}
              </span>
            )}
          </RelativeTime>
          {pinnedMessages ? (
          <Button
            className="px-2 py-1 h-6 text-xs"
            key={group[0].id}
            onClick={() => scrollToMessage(group[0].id)}
          >
            MOVE
          </Button>
          ) : (null)}
        </div>
        <div className="flex min-w-0 flex-col">
          {group.map((message) => (
            <div key={message.id}
                id={`message-${message.id}`}
                ref={!pinnedMessages ? (el: HTMLDivElement | null) => {
                  messageRefs.current[message.id] = el;
                } : null}
            >
              <Message key={message.id} message={message} pinnedMessages={pinnedMessages}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export { MessagesGroup };
