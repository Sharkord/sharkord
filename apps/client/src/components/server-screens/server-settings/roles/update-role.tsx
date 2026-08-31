import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useSettingsForm } from '@/components/server-screens/settings-shell/use-settings-form';
import { requestConfirmation } from '@/features/dialogs/actions';
import { getTRPCClient } from '@/lib/trpc';
import {
  getTrpcError,
  OWNER_ROLE_ID,
  type Permission,
  STORAGE_MAX_QUOTA_PER_USER,
  STORAGE_MIN_QUOTA_PER_USER,
  type TJoinedRole
} from '@sharkord/shared';
import {
  Alert,
  AlertDescription,
  Group,
  IconButton,
  Input,
  Separator,
  Switch,
  Tooltip
} from '@sharkord/ui';
import { filesize } from 'filesize';
import { Info, Star, Trash2, X } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { QUOTA_BY_USER_PRESETS } from '../storage/presets';
import { StorageSizeControl } from '../storage/storage-size-control';
import { PermissionList } from './permissions-list';

type TRoleValues = {
  name: string;
  color: string;
  permissions: Permission[];
  storageQuotaOverrideEnabled: boolean;
  storageSpaceQuota: number;
};

type TUpdateRoleProps = {
  selectedRole: TJoinedRole;
  setSelectedRoleId: (id: number | undefined) => void;
  refetch: () => void;
};

const UpdateRole = memo(
  ({ selectedRole, setSelectedRoleId, refetch }: TUpdateRoleProps) => {
    const { t } = useTranslation('settings');

    const onSave = useCallback(
      async (values: TRoleValues) => {
        const trpc = getTRPCClient();

        await trpc.roles.update.mutate({ roleId: selectedRole.id, ...values });

        await refetch();
      },
      [selectedRole.id, refetch]
    );

    const { r, onChange, values } = useSettingsForm<TRoleValues>({
      initialValues: {
        name: selectedRole.name,
        color: selectedRole.color,
        permissions: selectedRole.permissions,
        storageQuotaOverrideEnabled: selectedRole.storageQuotaOverrideEnabled,
        storageSpaceQuota: selectedRole.storageSpaceQuota
      },
      onSave,
      successMessage: t('roleUpdated'),
      errorMessage: t('failedUpdateRole')
    });

    const isOwnerRole = selectedRole.id === OWNER_ROLE_ID;
    const storageQuotaLabel = filesize(Number(values.storageSpaceQuota ?? 0), {
      output: 'object',
      standard: 'jedec'
    });

    const onDeleteRole = useCallback(async () => {
      const choice = await requestConfirmation({
        title: t('deleteRoleTitle'),
        message: t('deleteRoleMsg'),
        confirmLabel: t('deleteRoleBtn')
      });

      if (!choice) return;

      const trpc = getTRPCClient();

      try {
        await trpc.roles.delete.mutate({ roleId: selectedRole.id });
        toast.success(t('roleDeleted'));
        refetch();
        setSelectedRoleId(undefined);
      } catch {
        toast.error(t('roleDeleteFailed'));
      }
    }, [selectedRole.id, refetch, setSelectedRoleId, t]);

    const onClose = useCallback(
      () => setSelectedRoleId(undefined),
      [setSelectedRoleId]
    );

    const handlePermissionsChange = useCallback(
      (permissions: Permission[]) => onChange('permissions', permissions),
      [onChange]
    );

    const handleStorageOverrideChange = useCallback(
      (checked: boolean) => onChange('storageQuotaOverrideEnabled', checked),
      [onChange]
    );

    const handleStorageQuotaChange = useCallback(
      (value: number) => onChange('storageSpaceQuota', value),
      [onChange]
    );

    const onSetAsDefaultRole = useCallback(async () => {
      const choice = await requestConfirmation({
        title: t('setDefaultRoleTitle'),
        message: t('setDefaultRoleMsg'),
        confirmLabel: t('setDefaultRoleBtn')
      });

      if (!choice) return;

      const trpc = getTRPCClient();

      try {
        await trpc.roles.setDefault.mutate({ roleId: selectedRole.id });

        toast.success(t('defaultRoleUpdated'));
        refetch();
      } catch (error) {
        toast.error(getTrpcError(error, t('failedSetDefaultRole')));
      }
    }, [selectedRole.id, refetch, t]);

    return (
      <SettingsSection
        className="flex-1"
        title={t('editRoleTitle')}
        action={
          <>
            <Tooltip content={t('setAsDefaultRoleTooltip')}>
              <IconButton
                icon={Star}
                size="sm"
                variant="ghost"
                disabled={selectedRole.isDefault}
                onClick={onSetAsDefaultRole}
              />
            </Tooltip>
            <Tooltip content={t('deleteRoleTooltip')}>
              <IconButton
                icon={Trash2}
                size="sm"
                variant="destructive"
                disabled={selectedRole.isPersistent || selectedRole.isDefault}
                onClick={onDeleteRole}
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
        {selectedRole.isDefault && (
          <Alert variant="default">
            <Star />
            <AlertDescription>{t('defaultRoleInfo')}</AlertDescription>
          </Alert>
        )}

        {isOwnerRole && (
          <Alert variant="default">
            <Info />
            <AlertDescription>{t('ownerRoleInfo')}</AlertDescription>
          </Alert>
        )}

        <Group label={t('roleNameLabel')}>
          <Input {...r('name')} />
        </Group>

        <Group label={t('roleColorLabel')}>
          <div className="flex gap-2">
            <Input className="h-10 w-20" {...r('color', 'color')} />
            <Input className="flex-1" {...r('color')} />
          </div>
        </Group>

        <PermissionList
          permissions={values.permissions}
          disabled={OWNER_ROLE_ID === selectedRole.id}
          setPermissions={handlePermissionsChange}
        />

        <Separator />

        <Group
          label={t('roleStorageOverrideLabel')}
          description={t('roleStorageOverrideDesc')}
        >
          <Switch
            checked={!!values.storageQuotaOverrideEnabled}
            onCheckedChange={handleStorageOverrideChange}
          />
        </Group>

        <Group label={t('roleStorageQuotaLabel')}>
          <StorageSizeControl
            value={Number(values.storageSpaceQuota)}
            max={STORAGE_MAX_QUOTA_PER_USER}
            min={STORAGE_MIN_QUOTA_PER_USER}
            disabled={!values.storageQuotaOverrideEnabled}
            onChange={handleStorageQuotaChange}
            preview={
              Number(values.storageSpaceQuota) === 0 ? (
                t('unlimitedLabel')
              ) : (
                <>
                  {storageQuotaLabel.value} {storageQuotaLabel.unit}
                </>
              )
            }
            presets={QUOTA_BY_USER_PRESETS}
          />
        </Group>
      </SettingsSection>
    );
  }
);

export { UpdateRole };
