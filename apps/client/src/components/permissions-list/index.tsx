import { cn } from '@/lib/utils';
import { Permission, permissionLabels } from '@sharkord/shared';
import { memo } from 'react';
import { Badge } from '@sharkord/ui';

type PermissionsListProps = {
  permissions: Permission[];
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  layout?: 'grid' | 'inline';
  className?: string;
  maxDisplay?: number;
};

const PermissionsList = memo(
  ({
    permissions,
    variant = 'secondary',
    size = 'md',
    layout = 'inline',
    className = '',
    maxDisplay
  }: PermissionsListProps) => {
    if (!permissions.length) {
      return (
        <div
          className={cn(
            'flex items-center gap-2 text-muted-foreground',
            size === 'sm' && 'text-xs',
            size === 'md' && 'text-sm',
            size === 'lg' && 'text-base',
            className
          )}
        >
          <span>No permissions</span>
        </div>
      );
    }

    const displayPermissions = maxDisplay
      ? permissions.slice(0, maxDisplay)
      : permissions;

    const remainingCount =
      maxDisplay && permissions.length > maxDisplay
        ? permissions.length - maxDisplay
        : 0;

    return (
      <div
        className={cn(
          'flex gap-1 select-none',
          layout === 'grid' && 'flex-wrap',
          layout === 'inline' && 'flex-wrap',
          className
        )}
      >
        {displayPermissions.map((permission) => (
          <Badge
            key={permission}
            variant={variant}
            className={cn(
              'flex items-center gap-1 font-normal',
              size === 'sm' && 'text-[10px] px-1.5 py-0.5 h-5',
              size === 'md' && 'text-xs px-2 py-1 h-6',
              size === 'lg' && 'text-sm px-2.5 py-1 h-7'
            )}
          >
            {permissionLabels[permission]}
          </Badge>
        ))}
        {remainingCount > 0 && (
          <Badge
            variant="outline"
            className={cn(
              'flex items-center font-normal text-muted-foreground',
              size === 'sm' && 'text-[10px] px-1.5 py-0.5 h-5',
              size === 'md' && 'text-xs px-2 py-1 h-6',
              size === 'lg' && 'text-sm px-2.5 py-1 h-7'
            )}
          >
            +{remainingCount} more
          </Badge>
        )}
      </div>
    );
  }
);

PermissionsList.displayName = 'PermissionsList';

export { PermissionsList };
