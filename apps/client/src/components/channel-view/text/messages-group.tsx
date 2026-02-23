import { PinnedMessageContext } from '@/components/pinned-message-provider/pinned-message-context';
import { RelativeTime } from '@/components/relative-time';
import { UserAvatar } from '@/components/user-avatar';
import { useIsOwnUser, useUserById } from '@/features/server/users/hooks';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { cn } from '@/lib/utils';
import {
  DELETED_USER_IDENTITY_AND_NAME,
  type TJoinedMessage
} from '@sharkord/shared';
import { Button } from '@sharkord/ui';
import { format } from 'date-fns';
import { memo, useContext } from 'react';
import { Message } from './message';

type TMessagesGroupProps = {
  group: TJoinedMessage[];
};

const MessagesGroup = memo(
  ({
    group,
    messageRefs,
    type
  }: TMessagesGroupProps & {
    messageRefs: React.RefObject<Record<number, HTMLDivElement | null>> | null;
    type: string;
  }) => {
    const firstMessage = group[0];
    const user = useUserById(firstMessage.userId);
    const date = new Date(firstMessage.createdAt);
    const isOwnUser = useIsOwnUser(firstMessage.userId);
    const isDeletedUser = user?.name === DELETED_USER_IDENTITY_AND_NAME;
    const pinnedMessageContext = useContext(PinnedMessageContext);

    if (!user) return null;

    function scrollToMessage(id: number) {
      const el = messageRefs?.current[id];
      if (el) {
        // Scroll to the message element
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Apply highlight
        el.style.transition = 'background-color 1s ease';

        requestAnimationFrame(() => {
          el.style.setProperty('--color-secondary', 'var(--secondary)');
          el.style.backgroundColor = 'var(--color-secondary)';
          el.className = 'rounded-md';

          // Remove highlight after 2 seconds
          setTimeout(() => {
            el.style.backgroundColor = '';
          }, 2000);
        });
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
            {type === 'pinned' ? (
              <Button
                variant="outline"
                className="px-2 py-1 h-6 text-xs"
                key={group[0].id}
                onClick={() => {
                  scrollToMessage(group[0].id);
                  pinnedMessageContext.setVisible(false);
                }}
              >
                MOVE
              </Button>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-col">
            {group.map((message) => (
              <div
                key={message.id}
                id={`message-${message.id}`}
                ref={
                  type === 'channel' && messageRefs
                    ? (el: HTMLDivElement | null) => {
                        messageRefs.current[message.id] = el;
                      }
                    : null
                }
              >
                <Message key={message.id} message={message} type={type} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

export { MessagesGroup };
