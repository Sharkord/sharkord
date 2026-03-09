import { Permission as EPermission } from '@sharkord/shared';
import { Label, Switch } from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const availablePermissions = Object.values(EPermission);

type TPermissionProps = {
  permission: EPermission;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
};

const Permission = memo(
  ({ permission, enabled, onChange, disabled }: TPermissionProps) => {
    const { t } = useTranslation('settings');

    return (
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <Label>{t(`perm_${permission}` as `perm_SEND_MESSAGES`)}</Label>
          <span className="text-sm text-muted-foreground">
            {t(`permDesc_${permission}` as `permDesc_SEND_MESSAGES`)}
          </span>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onChange}
          disabled={disabled}
        />
      </div>
    );
  }
);

type TPermissionListProps = {
  permissions: EPermission[];
  setPermissions: (permissions: EPermission[]) => void;
  disabled?: boolean;
};

const PermissionList = memo(
  ({ permissions, setPermissions, disabled }: TPermissionListProps) => {
    const { t } = useTranslation('settings');

    const onTogglePermission = useCallback(
      (permission: EPermission) => {
        if (permissions.includes(permission)) {
          setPermissions(permissions.filter((p) => p !== permission));
        } else {
          setPermissions([...permissions, permission]);
        }
      },
      [permissions, setPermissions]
    );

    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">{t('permissionsHeader')}</h3>

        <div className="space-y-3">
          {availablePermissions.map((permission) => (
            <Permission
              key={permission}
              permission={permission}
              enabled={permissions.includes(permission)}
              onChange={() => onTogglePermission(permission)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
    );
  }
);

export { PermissionList };
