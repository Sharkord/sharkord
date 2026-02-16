import { UserName } from '@/components/user-name';
import { UserAvatar } from '@/components/user-avatar';
import { useRoles } from '@/features/server/roles/hooks';
import { useUsers } from '@/features/server/users/hooks';
import { cn } from '@/lib/utils';
import type { TJoinedPublicUser, TJoinedRole } from '@sharkord/shared';
import { memo, useMemo } from 'react';
import { UserPopover } from '../user-popover';

const MAX_USERS_TO_SHOW = 100;
const NO_ROLE_SECTION_LABEL = 'No Role';

const compareRolesByPriority = (a: TJoinedRole, b: TJoinedRole) => {
  const permissionsDiff = b.permissions.length - a.permissions.length;

  if (permissionsDiff !== 0) {
    return permissionsDiff;
  }

  return a.id - b.id;
};

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
        <UserName
          userId={userId}
          name={name}
          banned={banned}
          className={cn(
            'text-sm text-foreground',
            banned && 'line-through text-muted-foreground'
          )}
        />
      </div>
    </UserPopover>
  );
});

type TUserSection = {
  id: string;
  label: string;
  users: TJoinedPublicUser[];
};

type TUsersListProps = {
  users: TJoinedPublicUser[];
};

const UsersList = memo(({ users }: TUsersListProps) => {
  const usersToShow = useMemo(
    () => users.slice(0, MAX_USERS_TO_SHOW),
    [users]
  );
  const hiddenCount = users.length - usersToShow.length;

  return (
    <div className="space-y-1">
      {usersToShow.map((user) => (
        <User
          key={user.id}
          userId={user.id}
          name={user.name}
          banned={user.banned}
        />
      ))}
      {hiddenCount > 0 && (
        <div className="text-sm text-muted-foreground px-2 py-1.5">
          +{hiddenCount} more...
        </div>
      )}
    </div>
  );
});

type TUserSectionProps = {
  label: string;
  users: TJoinedPublicUser[];
};

const UserSection = memo(({ label, users }: TUserSectionProps) => {
  return (
    <div className="mb-4">
      <div className="mb-1 flex w-full items-center px-2 py-1 text-xs font-semibold text-muted-foreground">
        {label} — {users.length}
      </div>
      <UsersList users={users} />
    </div>
  );
});

type TRightSidebarProps = {
  className?: string;
  isOpen?: boolean;
};

const RightSidebar = memo(
  ({ className, isOpen = true }: TRightSidebarProps) => {
    const users = useUsers();
    const roles = useRoles();

    const sortedRoles = useMemo(
      () => [...roles].sort(compareRolesByPriority),
      [roles]
    );

    const roleById = useMemo(
      () => new Map(sortedRoles.map((role) => [role.id, role])),
      [sortedRoles]
    );

    const { onlineSections, offlineUsers } = useMemo(() => {
      const offlineUsers: TJoinedPublicUser[] = [];
      const onlineUsersByRoleId = new Map<number, TJoinedPublicUser[]>();
      const noRoleUsers: TJoinedPublicUser[] = [];

      users.forEach((user) => {
        const status = String(user.status ?? 'offline').toLowerCase();

        if (status === 'offline') {
          offlineUsers.push(user);
          return;
        }

        const userRoles = user.roleIds
          .map((roleId) => roleById.get(roleId))
          .filter((role): role is TJoinedRole => !!role);

        if (userRoles.length === 0) {
          noRoleUsers.push(user);
          return;
        }

        const primaryRole = userRoles.reduce((bestRole, role) =>
          compareRolesByPriority(role, bestRole) < 0 ? role : bestRole
        );

        const usersForRole = onlineUsersByRoleId.get(primaryRole.id) ?? [];
        usersForRole.push(user);
        onlineUsersByRoleId.set(primaryRole.id, usersForRole);
      });

      const onlineSections: TUserSection[] = sortedRoles.reduce<TUserSection[]>(
        (sections, role) => {
          const roleUsers = onlineUsersByRoleId.get(role.id);

          if (!roleUsers || roleUsers.length === 0) {
            return sections;
          }

          sections.push({
            id: `role-${role.id}`,
            label: role.name,
            users: roleUsers
          });

          return sections;
        },
        []
      );

      if (noRoleUsers.length > 0) {
        onlineSections.push({
          id: 'no-role',
          label: NO_ROLE_SECTION_LABEL,
          users: noRoleUsers
        });
      }

      return {
        onlineSections,
        offlineUsers
      };
    }, [users, roleById, sortedRoles]);

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
                Members — {users.length}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {onlineSections.map((section) => (
                <UserSection
                  key={section.id}
                  label={section.label}
                  users={section.users}
                />
              ))}

              <UserSection label="Offline" users={offlineUsers} />
            </div>
          </>
        )}
      </aside>
    );
  }
);

export { RightSidebar };
