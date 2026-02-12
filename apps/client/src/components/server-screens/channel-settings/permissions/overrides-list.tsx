import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useRoleById } from '@/features/server/roles/hooks';
import { useUserById } from '@/features/server/users/hooks';
import { getInitialsFromName } from '@/helpers/get-initials-from-name';
import { getTrpcError } from '@/helpers/parse-trpc-errors';
import { i18n } from '@/i18n';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import type {
  TChannelRolePermission,
  TChannelUserPermission
} from '@sharkord/shared';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { SearchPopover } from './search-popover';
import type { TChannelPermissionType } from './types';

type TRoleItemProps = {
  roleId: number;
  selectedKey: string;
  setSelectedKey: (key: string) => void;
};

const RoleItem = memo(
  ({ roleId, selectedKey, setSelectedKey }: TRoleItemProps) => {
    const role = useRoleById(roleId);
    const key = `role-${roleId}`;
    const isSelected = selectedKey === key;

    if (!role) return null;

    return (
      <button
        onClick={() => setSelectedKey(key)}
        className={cn(
          'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
          {
            'bg-accent': isSelected
          }
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: role.color }}
          />
          <span>{role.name}</span>
        </div>
      </button>
    );
  }
);

type TUserItemProps = {
  userId: number;
  selectedKey: string;
  setSelectedKey: (key: string) => void;
};

const UserItem = memo(
  ({ userId, selectedKey, setSelectedKey }: TUserItemProps) => {
    const user = useUserById(userId);
    const key = `user-${userId}`;
    const isSelected = selectedKey === key;

    if (!user) return null;

    return (
      <button
        onClick={() => setSelectedKey(key)}
        className={cn(
          'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
          {
            'bg-accent': isSelected
          }
        )}
      >
        <div className="flex items-center gap-2">
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[10px]">
              {getInitialsFromName(user.name)}
            </AvatarFallback>
          </Avatar>
          <span>{user.name}</span>
        </div>
      </button>
    );
  }
);

type TRolesSectionProps = {
  rolePermissions: TChannelRolePermission[];
  selectedKey: string;
  setSelectedKey: (key: string) => void;
};

const RolesSection = memo(
  ({ rolePermissions, selectedKey, setSelectedKey }: TRolesSectionProps) => {
    const roleIds = useMemo(
      () => Array.from(new Set(rolePermissions.map((perm) => perm.roleId))),
      [rolePermissions]
    );

    if (roleIds.length === 0) return null;

    return (
      <>
        <div className="px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
          Roles
        </div>
        {roleIds.map((roleId) => (
          <RoleItem
            key={roleId}
            roleId={roleId}
            selectedKey={selectedKey}
            setSelectedKey={setSelectedKey}
          />
        ))}
      </>
    );
  }
);

type TUsersSectionProps = {
  userPermissions: TChannelUserPermission[];
  selectedKey: string;
  setSelectedKey: (key: string) => void;
};

const UsersSection = memo(
  ({ userPermissions, selectedKey, setSelectedKey }: TUsersSectionProps) => {
    const userIds = useMemo(
      () => Array.from(new Set(userPermissions.map((perm) => perm.userId))),
      [userPermissions]
    );

    if (userIds.length === 0) return null;

    return (
      <>
        <div className="px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
          Users
        </div>
        {userIds.map((userId) => (
          <UserItem
            key={userId}
            userId={userId}
            selectedKey={selectedKey}
            setSelectedKey={setSelectedKey}
          />
        ))}
      </>
    );
  }
);

type TOverridesListProps = {
  channelId: number;
  rolePermissions: TChannelRolePermission[];
  userPermissions: TChannelUserPermission[];
  selectedOverrideId: string | undefined;
  setSelectedOverrideId: (id: string | undefined) => void;
  refetch: () => Promise<void>;
};

const OverridesList = memo(
  ({
    rolePermissions,
    userPermissions,
    selectedOverrideId,
    channelId,
    setSelectedOverrideId,
    refetch
  }: TOverridesListProps) => {
    const { t } = useTranslation();
    const hasRoles = rolePermissions.length > 0;
    const hasUsers = userPermissions.length > 0;
    const isEmpty = !hasRoles && !hasUsers;

    const usedRolesIds = useMemo(() => {
      return Array.from(new Set(rolePermissions.map((perm) => perm.roleId)));
    }, [rolePermissions]);

    const usedUserIds = useMemo(() => {
      return Array.from(new Set(userPermissions.map((perm) => perm.userId)));
    }, [userPermissions]);

    const onSelect = useCallback(
      async (type: TChannelPermissionType, targetId: number) => {
        const trpc = getTRPCClient();

        try {
          const payload = {
            channelId
          };

          if (type === 'role') {
            Object.assign(payload, { roleId: targetId });
          } else {
            Object.assign(payload, { userId: targetId });
          }

          await trpc.channels.updatePermissions.mutate({
            ...payload,
            isCreate: true
          });

          toast.success(i18n.t('toasts.permissions.overrideAdded'));

          setSelectedOverrideId(`${type}-${targetId}`);

          await refetch();
        } catch (error) {
          toast.error(
            getTrpcError(error, t('errors.channel.permissionOverrideAddFailed'))
          );
        }
      },
      [channelId, setSelectedOverrideId, refetch, t]
    );

    return (
      <Card className="w-64 flex-shrink-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Roles/Users</CardTitle>
            <SearchPopover
              onSelect={onSelect}
              ignoreRoleIds={usedRolesIds}
              ignoreUserIds={usedUserIds}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-2 p-2">
          {isEmpty ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No permission overrides yet
            </div>
          ) : (
            <>
              <RolesSection
                rolePermissions={rolePermissions}
                selectedKey={selectedOverrideId || ''}
                setSelectedKey={setSelectedOverrideId}
              />

              {hasRoles && hasUsers && <Separator className="my-2" />}

              <UsersSection
                userPermissions={userPermissions}
                selectedKey={selectedOverrideId || ''}
                setSelectedKey={setSelectedOverrideId}
              />
            </>
          )}
        </CardContent>
      </Card>
    );
  }
);

export { OverridesList };
