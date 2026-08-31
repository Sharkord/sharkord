import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useSettingsForm } from '@/components/server-screens/settings-shell/use-settings-form';
import { UserAvatar } from '@/components/user-avatar';
import { useRoleById } from '@/features/server/roles/hooks';
import { useUserById } from '@/features/server/users/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { ChannelPermission, getTrpcError } from '@sharkord/shared';
import { CardTitle, IconButton, Tooltip } from '@sharkord/ui';
import { Trash2, X } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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

type TOverrideValues = {
  permissions: TChannelPermission[];
};

const Override = memo(
  ({
    channelId,
    overrideId,
    permissions,
    setSelectedOverrideId,
    refetch
  }: TOverrideProps) => {
    const { t } = useTranslation('settings');
    const [overrideType, targetIdStr] = overrideId.split('-');
    const targetId = parseInt(targetIdStr, 10);
    const isRole = overrideType === 'role';

    const onSave = useCallback(
      async (values: TOverrideValues) => {
        const trpc = getTRPCClient();
        const target = isRole ? { roleId: targetId } : { userId: targetId };

        await trpc.channels.updatePermissions.mutate({
          ...target,
          channelId,
          permissions: values.permissions
            .filter((perm) => perm.allow)
            .map((perm) => perm.permission)
        });

        await refetch();
      },
      [channelId, isRole, targetId, refetch]
    );

    const { values, onChange } = useSettingsForm<TOverrideValues>({
      initialValues: { permissions },
      onSave,
      successMessage: t('permissionOverrideUpdated'),
      errorMessage: t('failedUpdatePermissionOverride')
    });

    const onDeleteOverride = useCallback(async () => {
      const trpc = getTRPCClient();
      const target = isRole ? { roleId: targetId } : { userId: targetId };

      try {
        await trpc.channels.deletePermissions.mutate({ ...target, channelId });

        toast.success(t('permissionOverrideDeleted'));
        setSelectedOverrideId(undefined);

        await refetch();
      } catch (error) {
        toast.error(getTrpcError(error, t('failedDeletePermissionOverride')));
      }
    }, [channelId, isRole, targetId, setSelectedOverrideId, refetch, t]);

    const onClose = useCallback(
      () => setSelectedOverrideId(undefined),
      [setSelectedOverrideId]
    );

    const onTogglePermission = useCallback(
      (permission: ChannelPermission) => {
        onChange(
          'permissions',
          values.permissions.map((perm) =>
            perm.permission === permission
              ? { ...perm, allow: !perm.allow }
              : perm
          )
        );
      },
      [onChange, values.permissions]
    );

    return (
      <SettingsSection
        className="flex-1"
        title={
          isRole ? (
            <RoleHeader roleId={targetId} />
          ) : (
            <UserHeader userId={targetId} />
          )
        }
        action={
          <>
            <Tooltip content={t('deleteOverrideTooltip')}>
              <IconButton
                icon={Trash2}
                size="sm"
                variant="destructive"
                onClick={onDeleteOverride}
              />
            </Tooltip>
            <Tooltip content={t('closeEditorTooltip')}>
              <IconButton
                icon={X}
                size="sm"
                variant="ghost"
                onClick={onClose}
              />
            </Tooltip>
          </>
        }
      >
        <ChannelPermissionList
          permissions={values.permissions}
          onTogglePermission={onTogglePermission}
        />
      </SettingsSection>
    );
  }
);

export { Override };
