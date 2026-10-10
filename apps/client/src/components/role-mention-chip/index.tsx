import { useRoleById } from '@/features/server/roles/hooks';
import { useOwnUserHasRole } from '@/features/server/users/hooks';
import { cn } from '@/lib/utils';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type TRoleMentionChipProps = {
  roleId: number;
  label?: string;
};

const RoleMentionChip = memo(
  ({ roleId, label: labelProp }: TRoleMentionChipProps) => {
    const { t } = useTranslation('common');
    const role = useRoleById(roleId);
    const isOwnRole = useOwnUserHasRole(roleId);
    const label = role?.name ?? labelProp ?? t('unknownRole');

    const style = useMemo(
      () => (role ? { color: role.color } : undefined),
      [role]
    );

    return (
      <span
        style={style}
        className={cn(
          'role-mention rounded px-0.5 bg-primary/10',
          isOwnRole && 'bg-primary/20 font-medium'
        )}
      >
        @{label}
      </span>
    );
  }
);

export { RoleMentionChip };
