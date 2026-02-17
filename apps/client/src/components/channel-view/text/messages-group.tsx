import { RelativeTime } from '@/components/relative-time';
import { UserAvatar } from '@/components/user-avatar';
import { useIsOwnUser, useUserById } from '@/features/server/users/hooks';
import { cn } from '@/lib/utils';
import type { TJoinedMessage } from '@sharkord/shared';
import { format } from 'date-fns';
import { memo } from 'react';
import { Message } from './message';
import { useUserRoles } from '@/features/server/hooks';

type TMessagesGroupProps = {
  group: TJoinedMessage[];
};

const MessagesGroup = memo(({ group }: TMessagesGroupProps) => {
  const firstMessage = group[0];
  const user = useUserById(firstMessage.userId);
  const date = new Date(firstMessage.createdAt);
  const isOwnUser = useIsOwnUser(firstMessage.userId);
  const displayedRole = useUserRoles(firstMessage.userId).sort((a, b) => a.orderNr - b.orderNr).find((r) => r.isGrouping === true);
  let roleColor = '#ffffff';
  if(displayedRole){
    roleColor = displayedRole.color;
  }
  const isDeletedUser = user?.name === 'Deleted' && user.banned;

  if (!user) return null;

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
            <font color={roleColor}>
            {user.name}
            </font>
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
        </div>
        <div className="flex min-w-0 flex-col">
          {group.map((message) => (
            <Message key={message.id} message={message} />
          ))}
        </div>
      </div>
    </div>
  );
});

export { MessagesGroup };
