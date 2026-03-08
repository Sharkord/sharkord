import { useAdminRoles } from '@/features/server/admin/hooks';
import { Card, CardContent, LoadingCard } from '@sharkord/ui';
import { memo, useMemo, useState } from 'react';
import { RolesList } from './roles-list';
import { UpdateRole } from './update-role';

const Roles = memo(() => {
  const { roles, refetch, loading } = useAdminRoles();

  const [selectedRoleId, setSelectedRoleId] = useState<number | undefined>();

  const selectedRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) || null;
  }, [roles, selectedRoleId]);

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <div className="flex gap-6">
      <RolesList
        roles={roles}
        selectedRoleId={selectedRoleId}
        setSelectedRoleId={setSelectedRoleId}
        refetch={refetch}
      />

      {selectedRole ? (
        <UpdateRole
          key={selectedRole.id}
          selectedRole={selectedRole}
          setSelectedRoleId={setSelectedRoleId}
          refetch={refetch}
        />
      ) : (
        <Card className="flex flex-1 items-center justify-center">
          <CardContent className="py-12 text-center text-muted-foreground">
            Select a role to edit or create a new one
          </CardContent>
        </Card>
      )}
    </div>
  );
});

export { Roles };
