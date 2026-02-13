import { UserAvatar } from '@/components/user-avatar';
import { useUsers } from '@/features/server/users/hooks';
import { cn } from '@/lib/utils';
import { memo, useMemo } from 'react';
import { UserPopover } from '../user-popover';

type TUserProps = {
  userId: number;
  name: string;
  banned: boolean;
};

const User = memo(({ userId, name, banned }: TUserProps) => {
  return (
    <UserPopover userId={userId}>
      <div className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-accent select-none">
        <UserAvatar userId={userId} className="h-8 w-8" />
        <span
          className={cn(
            'text-sm text-foreground',
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
    const visibleUsers = useMemo(
      () => users.filter((user) => !(user.name === 'Deleted' && user.banned)),
      [users]
    );

    return (
      <aside
        className={cn(
          'flex flex-col border-l border-border bg-card h-full transition-all duration-500 ease-in-out',
          isOpen ? 'w-60' : 'w-0 border-l-0',
          className
        )}
        style={{
          overflow: isOpen ? 'visible' : 'hidden'
        }}
      >
        {isOpen && (
          <>
            <div className="flex h-12 items-center border-b border-border px-4">
              <h3 className="text-sm font-semibold text-foreground">
                Members — {visibleUsers.length}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <div className="space-y-1">
                {visibleUsers.map((user) => (
                  <User
                    key={user.id}
                    userId={user.id}
                    name={user.name}
                    banned={user.banned}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </aside>
    );
  }
);

export { RightSidebar };
