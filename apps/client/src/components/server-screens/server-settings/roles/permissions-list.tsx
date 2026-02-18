import {
  Permission as EPermission,
  permissionDescriptions,
  permissionLabels
} from '@sharkord/shared';
import { Label, Switch } from '@sharkord/ui';
import { memo, useCallback } from 'react';

const availablePermissions = Object.values(EPermission);

type TPermissionProps = {
  permission: EPermission;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
};

const Permission = memo(
  ({ permission, enabled, onChange, disabled }: TPermissionProps) => {
    return (
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <Label>{permissionLabels[permission]}</Label>
          <span className="text-sm text-muted-foreground">
            {permissionDescriptions[permission]}
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
        <h3 className="text-sm font-semibold">Permissions</h3>

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
