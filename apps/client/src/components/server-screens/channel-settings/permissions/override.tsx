import { UserAvatar } from '@/components/user-avatar';
import { useRoleById } from '@/features/server/roles/hooks';
import { useUserById } from '@/features/server/users/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { ChannelPermission, getTrpcError } from '@sharkord/shared';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@sharkord/ui';
import { Trash2 } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { ChannelPermissionList } from './channel-permission-list';
import type { TChannelPermission } from './types';

type TUserHeaderProps = {
  userId: number;
};

const UserHeader = memo(({ userId }: TUserHeaderProps) => {
  const user = useUserById(userId);

  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      <UserAvatar userId={userId} />
      <CardTitle>{user.name}</CardTitle>
    </div>
  );
});

type TRoleHeaderProps = {
  roleId: number;
};

const RoleHeader = memo(({ roleId }: TRoleHeaderProps) => {
  const role = useRoleById(roleId);

  if (!role) return null;

  return (
    <div className="flex items-center gap-3">
      <div
        className="h-6 w-6 rounded-full"
        style={{ backgroundColor: role.color }}
      />
      <CardTitle>{role.name}</CardTitle>
    </div>
  );
});

type TOverrideProps = {
  channelId: number;
  overrideId: string; // Format: "role-{id}" or "user-{id}"
  permissions: TChannelPermission[];
  setSelectedOverrideId: (id: string | undefined) => void;
  refetch: () => Promise<void>;
};

const Override = memo(
  ({
    channelId,
    overrideId,
    permissions,
    setSelectedOverrideId,
    refetch
  }: TOverrideProps) => {
    const [localPermissions, setLocalPermissions] =
      useState<TChannelPermission[]>(permissions);
    const [overrideType, targetIdStr] = overrideId.split('-');
    const targetId = parseInt(targetIdStr, 10);
    const isRole = overrideType === 'role';

    const onDeleteOverride = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        const payload = {};

        if (isRole) {
          Object.assign(payload, { roleId: targetId });
        } else {
          Object.assign(payload, { userId: targetId });
        }

        await trpc.channels.deletePermissions.mutate({
          ...payload,
          channelId
        });

        toast.success('Permission override deleted');
        setSelectedOverrideId(undefined);

        await refetch();
      } catch (error) {
        toast.error(
          getTrpcError(error, 'Failed to delete permission override')
        );
      }
    }, [channelId, isRole, targetId, setSelectedOverrideId, refetch]);

    const onUpdateOverride = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        const payload = { channelId };

        if (isRole) {
          Object.assign(payload, { roleId: targetId });
        } else {
          Object.assign(payload, { userId: targetId });
        }

        const allowedPermissions = localPermissions
          .filter((perm) => perm.allow)
          .map((perm) => perm.permission);

        await trpc.channels.updatePermissions.mutate({
          ...payload,
          permissions: allowedPermissions
        });

        toast.success('Permission override updated');
        await refetch();
      } catch (error) {
        toast.error(
          getTrpcError(error, 'Failed to update permission override')
        );
      }
    }, [channelId, isRole, targetId, localPermissions, refetch]);

    const onTogglePermission = useCallback((permission: ChannelPermission) => {
      setLocalPermissions((prevPermissions) =>
        prevPermissions.map((perm) =>
          perm.permission === permission
            ? { ...perm, allow: !perm.allow }
            : perm
        )
      );
    }, []);

    return (
      <Card className="flex-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {overrideType === 'role' ? (
                <RoleHeader roleId={targetId} />
              ) : (
                <UserHeader userId={targetId} />
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={onDeleteOverride}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <ChannelPermissionList
            permissions={localPermissions}
            onTogglePermission={onTogglePermission}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setSelectedOverrideId(undefined)}
            >
              Cancel
            </Button>
            <Button onClick={onUpdateOverride}>Save Changes</Button>
          </div>
        </CardContent>
      </Card>
    );
  }
);

export { Override };
