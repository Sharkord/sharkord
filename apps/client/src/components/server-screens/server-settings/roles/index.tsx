import { SettingsListEditor } from '@/components/server-screens/settings-shell/list-editor';
import { useAdminRoles } from '@/features/server/admin/hooks';
import { LoadingCard } from '@sharkord/ui';
import { Shield } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RolesList } from './roles-list';
import { UpdateRole } from './update-role';

const Roles = memo(() => {
  const { t } = useTranslation('settings');
  const { roles, refetch, loading } = useAdminRoles();

  const [selectedRoleId, setSelectedRoleId] = useState<number | undefined>();

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId),
    [roles, selectedRoleId]
  );

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <SettingsListEditor
      emptyIcon={Shield}
      emptyTitle={t('selectRoleToEdit')}
      list={
        <RolesList
          roles={roles}
          selectedRoleId={selectedRoleId}
          setSelectedRoleId={setSelectedRoleId}
          refetch={refetch}
        />
      }
      editor={
        selectedRole && (
          <UpdateRole
            key={selectedRole.id}
            selectedRole={selectedRole}
            setSelectedRoleId={setSelectedRoleId}
            refetch={refetch}
          />
        )
      }
    />
  );
});

export { Roles };
