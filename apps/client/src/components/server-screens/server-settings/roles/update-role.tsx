import { requestConfirmation } from '@/features/dialogs/actions';
import { useForm } from '@/hooks/use-form';
import { getTRPCClient } from '@/lib/trpc';
import {
  getTrpcError,
  OWNER_ROLE_ID,
  STORAGE_MAX_QUOTA_PER_USER,
  STORAGE_MIN_QUOTA_PER_USER,
  type TJoinedRole
} from '@sharkord/shared';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Separator,
  Switch,
  Tooltip
} from '@sharkord/ui';
import { filesize } from 'filesize';
import { Info, Star, Trash2 } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { QUOTA_BY_USER_PRESETS } from '../storage/presets';
import { StorageSizeControl } from '../storage/storage-size-control';
import { PermissionList } from './permissions-list';

type TUpdateRoleProps = {
  selectedRole: TJoinedRole;
  setSelectedRoleId: (id: number | undefined) => void;
  refetch: () => void;
};

const UpdateRole = memo(
  ({ selectedRole, setSelectedRoleId, refetch }: TUpdateRoleProps) => {
    const { t } = useTranslation('settings');
    const { setTrpcErrors, r, onChange, values } = useForm({
      name: selectedRole.name,
      color: selectedRole.color,
      permissions: selectedRole.permissions,
      storageQuotaOverrideEnabled: selectedRole.storageQuotaOverrideEnabled,
      storageSpaceQuota: selectedRole.storageSpaceQuota
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

    const onUpdateRole = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        await trpc.roles.update.mutate({
          roleId: selectedRole.id,
          ...values
        });

        toast.success(t('roleUpdated'));
        refetch();
      } catch (error) {
        setTrpcErrors(error);
      }
    }, [selectedRole.id, values, refetch, setTrpcErrors, t]);

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
      <Card className="flex-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('editRoleTitle')}</CardTitle>
            <div>
              <Tooltip content={t('setAsDefaultRoleTooltip')}>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={selectedRole.isDefault}
                  onClick={onSetAsDefaultRole}
                >
                  <Star className="h-4 w-4" />
                </Button>
              </Tooltip>
              <Button
                size="icon"
                variant="ghost"
                disabled={selectedRole.isPersistent || selectedRole.isDefault}
                onClick={onDeleteRole}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
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

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">{t('roleNameLabel')}</Label>
              <Input {...r('name')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-color">{t('roleColorLabel')}</Label>
              <div className="flex gap-2">
                <Input className="h-10 w-20" {...r('color', 'color')} />
                <Input className="flex-1" {...r('color')} />
              </div>
            </div>
          </div>

          <PermissionList
            permissions={values.permissions}
            disabled={OWNER_ROLE_ID === selectedRole.id}
            setPermissions={(permissions) =>
              onChange('permissions', permissions)
            }
          />

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="role-storage-override">
                  {t('roleStorageOverrideLabel')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('roleStorageOverrideDesc')}
                </p>
              </div>
              <Switch
                id="role-storage-override"
                checked={!!values.storageQuotaOverrideEnabled}
                onCheckedChange={(checked) =>
                  onChange('storageQuotaOverrideEnabled', checked)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>{t('roleStorageQuotaLabel')}</Label>
              <StorageSizeControl
                value={Number(values.storageSpaceQuota)}
                max={STORAGE_MAX_QUOTA_PER_USER}
                min={STORAGE_MIN_QUOTA_PER_USER}
                disabled={!values.storageQuotaOverrideEnabled}
                onChange={(value) => onChange('storageSpaceQuota', value)}
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
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setSelectedRoleId(undefined)}
            >
              {t('close')}
            </Button>
            <Button onClick={onUpdateRole}>{t('saveRoleBtn')}</Button>
          </div>
        </CardContent>
      </Card>
    );
  }
);

export { UpdateRole };
