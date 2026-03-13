import { ChannelPermission } from '@sharkord/shared';
import { Label, Switch } from '@sharkord/ui';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const availableChannelPermissions = Object.values(ChannelPermission);

type TChannelPermissionItemProps = {
  permission: ChannelPermission;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
};

const ChannelPermissionItem = memo(
  ({ permission, enabled, onChange }: TChannelPermissionItemProps) => {
    const { t } = useTranslation('settings');
    return (
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <Label>{t(`channelPerm_${permission}`)}</Label>
          <span className="text-sm text-muted-foreground">
            {t(`channelPermDesc_${permission}`)}
          </span>
        </div>
        <Switch checked={enabled} onCheckedChange={onChange} />
      </div>
    );
  }
);

type TChannelPermissionListProps = {
  permissions: Array<{ permission: string; allow: boolean }>;
  onTogglePermission: (permission: ChannelPermission) => void;
};

const ChannelPermissionList = memo(
  ({ permissions, onTogglePermission }: TChannelPermissionListProps) => {
    const { t } = useTranslation('settings');
    // Convert permissions array to a map for quick lookup
    const permissionsMap = useMemo(() => {
      const map = new Map<string, boolean>();
      permissions.forEach((perm) => {
        map.set(perm.permission, perm.allow);
      });
      return map;
    }, [permissions]);

    const handleToggle = useCallback(
      (permission: ChannelPermission) => {
        onTogglePermission(permission);
      },
      [onTogglePermission]
    );

    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">
          {t('channelPermissionsHeader')}
        </h3>

        <div className="space-y-3">
          {availableChannelPermissions.map((permission) => (
            <ChannelPermissionItem
              key={permission}
              permission={permission}
              enabled={permissionsMap.get(permission) ?? false}
              onChange={() => handleToggle(permission)}
            />
          ))}
        </div>
      </div>
    );
  }
);

export { ChannelPermissionList };
