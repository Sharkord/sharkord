import { PermissionsList } from '@/components/permissions-list';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { AutoFocus } from '@/components/ui/auto-focus';
import { Group } from '@/components/ui/group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useRoles } from '@/features/server/roles/hooks';
import { useOwnUserId } from '@/features/server/users/hooks';
import { getTrpcError } from '@/helpers/parse-trpc-errors';
import { getTRPCClient } from '@/lib/trpc';
import { type TJoinedUser } from '@sharkord/shared';
import { Info } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { TDialogBaseProps } from '../types';

type TAssignRoleDialogProps = TDialogBaseProps & {
  user: TJoinedUser;
  refetch: () => Promise<void>;
};

const AssignRoleDialog = memo(
  ({ isOpen, close, user, refetch }: TAssignRoleDialogProps) => {
    const { t } = useTranslation();
    const ownUserId = useOwnUserId();
    const roles = useRoles();
    const [selectedRoleId, setSelectedRoleId] = useState<number>(0);
    const isOwnUser = ownUserId === user.id;

    // Filter out roles the user already has
    const availableRoles = useMemo(
      () => roles.filter((role) => !user.roleIds.includes(role.id)),
      [roles, user.roleIds]
    );

    const selectedRole = useMemo(
      () => roles.find((role) => role.id === selectedRoleId),
      [roles, selectedRoleId]
    );

    const onSubmit = useCallback(async () => {
      if (selectedRoleId === 0) {
        toast.error(t('toasts.roles.assignSelectRole'));
        return;
      }

      try {
        const trpc = getTRPCClient();

        await trpc.users.addRole.mutate({
          userId: user.id,
          roleId: selectedRoleId
        });

        toast.success(t('toasts.roles.assignedSuccess'));
        close();
        refetch();
      } catch (error) {
        toast.error(getTrpcError(error, t('toasts.roles.assignFailed')));
      }
    }, [user.id, selectedRoleId, close, refetch, t]);

    return (
      <AlertDialog open={isOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign role to {user.name}</AlertDialogTitle>
            {isOwnUser && (
              <Alert variant="default">
                <Info />
                <AlertDescription>
                  You are assigning a role to yourself.
                </AlertDescription>
              </Alert>
            )}
            {availableRoles.length === 0 && (
              <Alert variant="default">
                <Info />
                <AlertDescription>
                  This user already has all available roles.
                </AlertDescription>
              </Alert>
            )}
          </AlertDialogHeader>
          <div className="flex flex-col gap-4">
            <Group label="Role">
              <Select
                onValueChange={(value) => setSelectedRoleId(Number(value))}
                value={selectedRoleId.toString()}
                disabled={availableRoles.length === 0}
              >
                <SelectTrigger className="w-[230px]">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Group>

            {selectedRole && (
              <PermissionsList
                permissions={selectedRole.permissions}
                variant="default"
                size="md"
              />
            )}
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={close}>Cancel</AlertDialogCancel>
            <AutoFocus>
              <AlertDialogAction
                onClick={onSubmit}
                disabled={availableRoles.length === 0 || selectedRoleId === 0}
              >
                Assign Role
              </AlertDialogAction>
            </AutoFocus>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

export { AssignRoleDialog };
