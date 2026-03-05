import {
  useAdminChannelGeneral,
  useAdminChannelPermissions
} from '@/features/server/admin/hooks';
import { ChannelPermission } from '@sharkord/shared';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LoadingCard
} from '@sharkord/ui';
import { MessageCircleWarning } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { Override } from './override';
import { OverridesList } from './overrides-list';
import type { TChannelPermission } from './types';

type TChannelPermissionsProps = {
  channelId: number;
};

const ChannelPermissions = memo(({ channelId }: TChannelPermissionsProps) => {
  const [selectedOverrideId, setSelectedOverrideId] = useState<
    string | undefined
  >();
  const { channel } = useAdminChannelGeneral(channelId);
  const { rolePermissions, userPermissions, loading, refetch } =
    useAdminChannelPermissions(channelId);

  const selectedPermissions = useMemo<TChannelPermission[]>(() => {
    if (!selectedOverrideId) return [];

    const [type, idStr] = selectedOverrideId.split('-');
    const id = parseInt(idStr);

    if (type === 'role') {
      return rolePermissions
        .filter((perm) => perm.roleId === id)
        .map((perm) => ({
          permission: perm.permission as ChannelPermission,
          allow: perm.allow
        }));
    } else {
      return userPermissions
        .filter((perm) => perm.userId === id)
        .map((perm) => ({
          permission: perm.permission as ChannelPermission,
          allow: perm.allow
        }));
    }
  }, [selectedOverrideId, rolePermissions, userPermissions]);

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissions</CardTitle>
        <CardDescription className="flex flex-col space-y-4">
          <span>
            Manage channel-specific permissions for roles and users. These
            permissions are not inherited from server-level permissions. User
            permissions take precedence over role permissions.
          </span>
          {!channel?.private && (
            <Alert variant="destructive">
              <MessageCircleWarning />
              <AlertTitle>Public channel</AlertTitle>
              <AlertDescription>
                This is a public channel; everyone has access by default. These
                permissions will not be applied unless the channel is set to
                private. You can do this in the General Settings tab.
              </AlertDescription>
            </Alert>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6">
          <OverridesList
            channelId={channelId}
            rolePermissions={rolePermissions}
            userPermissions={userPermissions}
            selectedOverrideId={selectedOverrideId}
            setSelectedOverrideId={setSelectedOverrideId}
            refetch={refetch}
          />

          {selectedOverrideId ? (
            <Override
              key={selectedOverrideId}
              channelId={channelId}
              overrideId={selectedOverrideId}
              permissions={selectedPermissions}
              setSelectedOverrideId={setSelectedOverrideId}
              refetch={refetch}
            />
          ) : (
            <Card className="flex flex-1 items-center justify-center">
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                Select a role or user to edit permissions, or add a new override
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export { ChannelPermissions };
