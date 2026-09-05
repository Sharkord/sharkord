import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import type { TJoinedRole } from '@sharkord/shared';
import { IconButton, Tooltip } from '@sharkord/ui';
import { Plus } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TRoleItemProps = {
  role: TJoinedRole;
  isSelected: boolean;
  onSelect: (roleId: number) => void;
};

const RoleItem = memo(({ role, isSelected, onSelect }: TRoleItemProps) => {
  const handleClick = useCallback(() => onSelect(role.id), [onSelect, role.id]);

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
        isSelected && 'bg-accent'
      )}
    >
      <div
        className="h-3 w-3 rounded-full"
        style={{ backgroundColor: role.color }}
      />
      <span className="truncate">{role.name}</span>
    </button>
  );
});

type TRolesListProps = {
  roles: TJoinedRole[];
  selectedRoleId: number | undefined;
  setSelectedRoleId: (roleId: number) => void;
  refetch: () => Promise<void>;
};

const RolesList = memo(
  ({ roles, selectedRoleId, setSelectedRoleId, refetch }: TRolesListProps) => {
    const { t } = useTranslation('settings');

    const onAddRole = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        const newRoleId = await trpc.roles.add.mutate();

        await refetch();

        setSelectedRoleId(newRoleId);
        toast.success(t('roleCreated'));
      } catch {
        toast.error(t('roleCreateFailed'));
      }
    }, [refetch, setSelectedRoleId, t]);

    return (
      <SettingsSection
        title={t('rolesTitle')}
        action={
          <Tooltip content={t('addRoleTooltip')}>
            <IconButton
              icon={Plus}
              size="sm"
              variant="ghost"
              onClick={onAddRole}
            />
          </Tooltip>
        }
      >
        <div className="space-y-1">
          {roles.map((role) => (
            <RoleItem
              key={role.id}
              role={role}
              isSelected={selectedRoleId === role.id}
              onSelect={setSelectedRoleId}
            />
          ))}
        </div>
      </SettingsSection>
    );
  }
);

export { RolesList };
