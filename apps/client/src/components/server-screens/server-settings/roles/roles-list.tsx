import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTRPCClient } from '@/lib/trpc';
import type { TJoinedRole } from '@sharkord/shared';
import { Plus, SquareArrowDown, SquareArrowUp } from 'lucide-react';
import { memo, useCallback } from 'react';
import { toast } from 'sonner';

type TRolesListProps = {
  roles: TJoinedRole[];
  selectedRoleId: number | undefined;
  setSelectedRoleId: (roleId: number) => void;
  refetch: () => void;
};

const RolesList = memo(
  ({ roles, selectedRoleId, setSelectedRoleId, refetch }: TRolesListProps) => {
    const onAddRole = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        const newRoleId = await trpc.roles.add.mutate();

        await refetch();

        setSelectedRoleId(newRoleId);
        toast.success('Role created');
      } catch {
        toast.error('Could not create role');
      }
    }, [refetch, setSelectedRoleId]);

    const onMoveRoleDown = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        if (!selectedRoleId && selectedRoleId !== 0) {
          toast.error('No role selected');
          return;
        }
        const sortedRoles = roles.sort((a, b) => b.orderNr - a.orderNr).reverse();
        const changedRole = roles.find((role) => role.id === selectedRoleId);
        const nextRole = sortedRoles.find((role) => role.orderNr > changedRole?.orderNr);
        const oldIndex = changedRole?.orderNr;


        if (!changedRole || !nextRole) {
          toast.error('Cannot Move Role Down');
          return;
        }
        await trpc.roles.update.mutate({
          roleId: selectedRoleId,
          name: changedRole.name,
          color: changedRole.color,
          permissions: changedRole.permissions,
          orderNr: 9999,
          isGrouping: changedRole.isGrouping
        });

        await trpc.roles.update.mutate({
          roleId: nextRole.id,
          name: nextRole.name,
          color: nextRole.color,
          permissions: nextRole.permissions,
          orderNr: oldIndex,
          isGrouping: nextRole.isGrouping
        });

        await trpc.roles.update.mutate({
          roleId: selectedRoleId,
          name: changedRole.name,
          color: changedRole.color,
          permissions: changedRole.permissions,
          orderNr: nextRole.orderNr,
          isGrouping: changedRole.isGrouping
        });
        toast.success('Role Moved Down');
        refetch();

      } catch (error) {
        console.log(error);
        toast.error('Could not Move role');
      }
    }, [refetch, setSelectedRoleId, roles, selectedRoleId]);

    const onMoveRoleUp = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        if (!selectedRoleId && selectedRoleId !== 0) {
          toast.error('No role selected');
          return;
        }
        const sortedRoles = roles.sort((a, b) => b.orderNr - a.orderNr);
        const changedRole = roles.find((role) => role.id === selectedRoleId);
        const lastRole = sortedRoles.find((role) => role.orderNr < changedRole?.orderNr);
        const oldIndex = changedRole?.orderNr;


        if (!changedRole || !lastRole) {
          toast.error('Cannot Move Role Up');
          return;
        }
        await trpc.roles.update.mutate({
          roleId: selectedRoleId,
          name: changedRole.name,
          color: changedRole.color,
          permissions: changedRole.permissions,
          orderNr: 9999,
          isGrouping: changedRole.isGrouping
        });

        await trpc.roles.update.mutate({
          roleId: lastRole.id,
          name: lastRole.name,
          color: lastRole.color,
          permissions: lastRole.permissions,
          orderNr: oldIndex,
          isGrouping: lastRole.isGrouping
        });

        await trpc.roles.update.mutate({
          roleId: selectedRoleId,
          name: changedRole.name,
          color: changedRole.color,
          permissions: changedRole.permissions,
          orderNr: lastRole.orderNr!,
          isGrouping: changedRole.isGrouping
        });

        toast.success('Role Moved Down');
        refetch();
      } catch (error) {
        console.log(error);
        toast.error('Could not Move role');
      }
    }, [refetch, setSelectedRoleId, roles, selectedRoleId]);


    return (
      <Card className="w-64 flex-shrink-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Roles</CardTitle>
              <Button size="icon" variant="ghost" onClick={onMoveRoleDown}>
                <SquareArrowDown className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={onMoveRoleUp}>
                <SquareArrowUp className="h-4 w-4" />
              </Button>
            </div>
            <Button size="icon" variant="ghost" onClick={onAddRole}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 p-2">
          {roles.sort(function (a, b) { return a.orderNr - b.orderNr }).map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRoleId(role.id)}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${selectedRoleId === role.id ? 'bg-accent' : ''
                }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: role.color }}
                />
                <span>{role.name}</span>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>
    );
  }
);

export { RolesList };
