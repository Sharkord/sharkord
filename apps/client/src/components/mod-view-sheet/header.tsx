import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { setModViewOpen } from '@/features/app/actions';
import {
  openDialog,
  requestConfirmation,
  requestTextInput
} from '@/features/dialogs/actions';
import { useUserRoles } from '@/features/server/hooks';
import { useOwnUserId, useUserStatus } from '@/features/server/users/hooks';
import { getTrpcError } from '@/helpers/parse-trpc-errors';
import { getTRPCClient } from '@/lib/trpc';
import { DELETED_USER_IDENTITY_AND_NAME, UserStatus } from '@sharkord/shared';
import { Gavel, Plus, Trash, UserMinus } from 'lucide-react';
import { memo, useCallback } from 'react';
import { toast } from 'sonner';
import { Dialog } from '../dialogs/dialogs';
import { RoleBadge } from '../role-badge';
import { useModViewContext } from './context';

const Header = memo(() => {
  const ownUserId = useOwnUserId();
  const { user, refetch } = useModViewContext();
  const status = useUserStatus(user.id);
  const userRoles = useUserRoles(user.id);
  const isDeletedUser = user.identity === DELETED_USER_IDENTITY_AND_NAME;
  const isOwnUser = user.id === ownUserId;

  const onRemoveRole = useCallback(
    async (roleId: number, roleName: string) => {
      const answer = await requestConfirmation({
        title: 'Remove Role',
        message: `Are you sure you want to remove the role "${roleName}" from this user?`,
        confirmLabel: 'Remove'
      });

      if (!answer) {
        return;
      }

      const trpc = getTRPCClient();

      try {
        await trpc.users.removeRole.mutate({
          userId: user.id,
          roleId
        });
        toast.success('Role removed successfully');
      } catch (error) {
        toast.error(getTrpcError(error, 'Failed to remove role'));
      } finally {
        refetch();
      }
    },
    [user.id, refetch]
  );

  const onKick = useCallback(async () => {
    const reason = await requestTextInput({
      title: 'Kick User',
      message: 'Please provide a reason for kicking this user (optional).',
      confirmLabel: 'Kick',
      allowEmpty: true
    });

    if (reason === null) {
      return;
    }

    const trpc = getTRPCClient();

    try {
      await trpc.users.kick.mutate({
        userId: user.id,
        reason
      });

      toast.success('User kicked successfully');
    } catch (error) {
      toast.error(getTrpcError(error, 'Failed to kick user'));
    } finally {
      refetch();
    }
  }, [user.id, refetch]);

  const onBan = useCallback(async () => {
    if (isDeletedUser) {
      toast.error('Cannot ban or unban the deleted user placeholder');
      return;
    }

    const trpc = getTRPCClient();

    const reason = await requestTextInput({
      title: 'Ban User',
      message: 'Please provide a reason for banning this user (optional).',
      confirmLabel: 'Ban',
      allowEmpty: true
    });

    if (reason === null) {
      return;
    }

    try {
      await trpc.users.ban.mutate({
        userId: user.id,
        reason
      });
      toast.success('User banned successfully');
    } catch (error) {
      toast.error(getTrpcError(error, 'Failed to ban user'));
    } finally {
      refetch();
    }
  }, [user.id, refetch, isDeletedUser]);

  const onUnban = useCallback(async () => {
    if (isDeletedUser) {
      toast.error('Cannot ban or unban the deleted user placeholder');
      return;
    }

    const trpc = getTRPCClient();

    const answer = await requestConfirmation({
      title: 'Unban User',
      message: 'Are you sure you want to unban this user?',
      confirmLabel: 'Unban'
    });

    if (!answer) {
      return;
    }

    try {
      await trpc.users.unban.mutate({
        userId: user.id
      });
      toast.success('User unbanned successfully');
    } catch (error) {
      toast.error(getTrpcError(error, 'Failed to unban user'));
    } finally {
      refetch();
    }
  }, [user.id, refetch, isDeletedUser]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <UserAvatar userId={user.id} className="h-12 w-12" />
        <h2 className="text-lg font-bold text-foreground">{user.name}</h2>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={onKick}
          disabled={status === UserStatus.OFFLINE}
        >
          <UserMinus className="h-4 w-4" />
          Kick
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => (user.banned ? onUnban() : onBan())}
          disabled={isOwnUser || isDeletedUser}
        >
          <Gavel className="h-4 w-4" />
          {user.banned ? 'Unban' : 'Ban'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            openDialog(Dialog.DELETE_USER, {
              user,
              refetch,
              onDelete: () => setModViewOpen(false)
            })
          }
          disabled={isOwnUser || isDeletedUser}
        >
          <Trash className="h-4 w-4" />
          Delete
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5 items-center">
        {userRoles.map((role) => (
          <RoleBadge key={role.id} role={role} onRemoveRole={onRemoveRole} />
        ))}
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-xs"
          disabled={isDeletedUser}
          onClick={() => openDialog(Dialog.ASSIGN_ROLE, { user, refetch })}
        >
          <Plus className="h-3 w-3" />
          Assign Role
        </Button>
      </div>
    </div>
  );
});

export { Header };
