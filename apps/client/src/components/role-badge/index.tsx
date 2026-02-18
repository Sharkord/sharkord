import type { TRole } from '@sharkord/shared';
import { X } from 'lucide-react';
import { memo } from 'react';
import { Badge } from '@sharkord/ui';
import { IconButton } from '@sharkord/ui';

type TRoleBadgeProps = {
  role: TRole;
  onRemoveRole?: (roleId: number, roleName: string) => void;
};

const RoleBadge = memo(({ role, onRemoveRole }: TRoleBadgeProps) => {
  return (
    <Badge
      style={{
        backgroundColor: role.color + '20',
        borderColor: role.color
      }}
    >
      <span style={{ color: role.color }}>{role.name}</span>
      {onRemoveRole && (
        <IconButton
          icon={X}
          size="xs"
          aria-label={`Remove ${role.name} role`}
          style={{ color: role.color }}
          onClick={() => onRemoveRole(role.id, role.name)}
        />
      )}
    </Badge>
  );
});

export { RoleBadge };
