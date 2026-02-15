import { UserAvatar } from '@/components/user-avatar';
import { useUserRoles } from '@/features/server/hooks';
import { useUsers } from '@/features/server/users/hooks';
import { useRoles } from '@/features/server/roles/hooks';
import { cn } from '@/lib/utils';
import { memo, useMemo } from 'react';
import { UserPopover } from '../user-popover';

const MAX_USERS_TO_SHOW = 100;

type TUserProps = {
  userId: number;
  name: string;
  banned: boolean;
};

type TUserGroup = {
  name: string;
  color?: string;
  users: TUserProps[];
};

const User = memo(({ userId, name, banned }: TUserProps) => {
  const role = useUserRoles(userId).at(0);
  return (
    <UserPopover userId={userId}>
      <div className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-accent select-none">
        <UserAvatar userId={userId} className="h-8 w-8" />
        <span
          className={cn(
            'text-sm text-foreground',
            banned && 'line-through text-muted-foreground'
          )}
        ><font color={role.color}>
            {name}
          </font>
        </span>
      </div>
    </UserPopover>
  );
});

const UserGroup = memo(({ group }: { group: TUserGroup }) => {
  return (
    <>
      <div className="flex h-12 items-center border-b border-border px-4">
        <h3 className="text-sm font-semibold text-foreground">
          {group.name} — {group.users.length}
        </h3>
      </div>
      <div>
        {group.users.map((user) => (
          <User
            key={user.userId}
            userId={user.userId}
            name={user.name}
            banned={user.banned}
          />
        ))}
      </div>
    </>
  );
});

type TRightSidebarProps = {
  className?: string;
  isOpen?: boolean;
};

const RightSidebar = memo(
  ({ className, isOpen = true }: TRightSidebarProps) => {
    const displayUsers = useUsers();
    const roles = useRoles();

    const userGroups: TUserGroup[] = useMemo(() => {
      if (!roles || roles.length === 0 || !displayUsers) return [];

      const groups: TUserGroup[] = [];

      for (const role of roles) {
        if (!role.isGrouping) continue; // Ignore non Grouping Roles

        const usersInGroup = displayUsers.filter((user) => {
          if (!user?.roleIds || !Array.isArray(user.roleIds)) return false;

          const userRoles = roles
            .filter((r) => user.roleIds.includes(r.id))
            .sort((a, b) => a.orderNr - b.orderNr); // Get all Roles User has

          const sortingRole = userRoles.find((r) => r.isGrouping === true);

          return sortingRole?.id === role.id;
        });

        if (usersInGroup.length > 0) {
          groups.push({
            name: role.name,
            color: role.color,
            users: usersInGroup.map((u) => ({ userId: u.id, name: u.name, banned: u.banned }))
          });
        }
      }

      return groups;
    }, [displayUsers, roles]);



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
            <div className="flex-1 overflow-y-auto p-2">
              {userGroups.map((g) => (
                <UserGroup key={g.name} group={g} />
              ))}
            </div>
          </>
        )}
      </aside>
    );
  }
);

export { RightSidebar };
