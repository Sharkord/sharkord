import { useUserRoles } from '@/features/server/hooks';
import { cn } from '@/lib/utils';
import { memo, useMemo } from 'react';

type TUserNameProps = {
  userId: number;
  name: string;
  className?: string;
  banned?: boolean;
};

const UserName = memo(
  ({ userId, name, className, banned = false }: TUserNameProps) => {
    const roles = useUserRoles(userId);

    const roleForColor = useMemo(() => {
      let selectedRole = roles[0];

      if (!selectedRole) return undefined;

      for (const role of roles) {
        if (role.permissions.length > selectedRole.permissions.length) {
          selectedRole = role;
          continue;
        }

        if (
          role.permissions.length === selectedRole.permissions.length &&
          role.id < selectedRole.id
        ) {
          selectedRole = role;
        }
      }

      return selectedRole;
    }, [roles]);

    const style =
      !banned && roleForColor?.color
        ? {
            color: roleForColor.color
          }
        : undefined;

    return (
      <span className={cn(className, banned && 'text-muted-foreground')} style={style}>
        {name}
      </span>
    );
  }
);

UserName.displayName = 'UserName';

export { UserName };
