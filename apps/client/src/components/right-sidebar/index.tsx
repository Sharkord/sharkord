import { UserAvatar } from '@/components/user-avatar';
import { useUsers } from '@/features/server/users/hooks';
import { cn } from '@/lib/utils';
import { memo } from 'react';
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
};

const RightSidebar = memo(({ className }: TRightSidebarProps) => {
  const users = useUsers();

  return (
    <aside
      className={cn(
        'flex w-60 flex-col border-l border-border bg-card h-full',
        className
      )}
    >
      <div className="flex h-12 items-center border-b border-border px-4">
        <h3 className="text-sm font-semibold text-foreground">
          Members — {users.length}
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {users.map((user) => (
            <User
              key={user.id}
              userId={user.id}
              name={user.name}
              banned={user.banned}
            />
          ))}
        </div>
      </div>
    </aside>
  );
});

export { RightSidebar };
