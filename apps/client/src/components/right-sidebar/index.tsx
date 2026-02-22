import { ResizableSidebar } from '@/components/resizable-sidebar';
import { UserAvatar } from '@/components/user-avatar';
import { useUsers } from '@/features/server/users/hooks';
import { LocalStorageKey } from '@/helpers/storage';
import { cn } from '@/lib/utils';
import { DELETED_USER_IDENTITY_AND_NAME } from '@sharkord/shared';
import { memo, useMemo } from 'react';
import { UserPopover } from '../user-popover';

const MAX_USERS_TO_SHOW = 100;
const MIN_WIDTH = 180;
const MAX_WIDTH = 360;
const DEFAULT_WIDTH = 240; // w-60 = 240px

type TUserProps = {
  userId: number;
  name: string;
  banned: boolean;
};

const User = memo(({ userId, name, banned }: TUserProps) => {
  return (
    <UserPopover userId={userId}>
      <div className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-accent select-none min-w-0">
        <UserAvatar userId={userId} className="h-8 w-8 shrink-0" />
        <span
          className={cn(
            'text-sm text-foreground truncate',
            banned && 'line-through text-muted-foreground'
          )}
        >
          {name}
        </span>
      </div>
    </UserPopover>
  );
});

type TRightSidebarProps = {
  className?: string;
  isOpen?: boolean;
};

const RightSidebar = memo(
  ({ className, isOpen = true }: TRightSidebarProps) => {
    const users = useUsers();

    const usersToShow = useMemo(
      () =>
        users
          .filter((user) => user.name !== DELETED_USER_IDENTITY_AND_NAME)
          .slice(0, MAX_USERS_TO_SHOW),
      [users]
    );

    const hasHiddenUsers = users.length > MAX_USERS_TO_SHOW;

    const usersCount = useMemo(
      () =>
        users.reduce((count, user) => {
          // exclude the special "Deleted User" from the count if it exists
          if (user.name !== DELETED_USER_IDENTITY_AND_NAME) {
            return count + 1;
          }

          return count;
        }, 0),
      [users]
    );

    return (
      <ResizableSidebar
        storageKey={LocalStorageKey.RIGHT_SIDEBAR_WIDTH}
        minWidth={MIN_WIDTH}
        maxWidth={MAX_WIDTH}
        defaultWidth={DEFAULT_WIDTH}
        edge="left"
        isOpen={isOpen}
        className={cn('h-full', className)}
      >
        <div className="flex h-12 items-center border-b border-border px-4">
          <h3 className="text-sm font-semibold text-foreground">
            Members — {usersCount}
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {usersToShow.map((user) => (
              <User
                key={user.id}
                userId={user.id}
                name={user.name}
                banned={user.banned}
              />
            ))}
            {hasHiddenUsers && (
              <div className="text-sm text-muted-foreground px-2 py-1.5">
                +{users.length - MAX_USERS_TO_SHOW} more...
              </div>
            )}
          </div>
        </div>
      </ResizableSidebar>
    );
  }
);

export { RightSidebar };
