import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import {
  openDialog,
  requestConfirmation,
  requestTextInput
} from '@/features/dialogs/actions';
import { useUserRoles } from '@/features/server/hooks';
import { useOwnUserId, useUserStatus, useUsers, useIsOwnUser } from '@/features/server/users/hooks';
import { getTrpcError } from '@/helpers/parse-trpc-errors';
import { getTRPCClient } from '@/lib/trpc';
import { UserStatus, Permission, isEmptyMessage } from '@sharkord/shared';
import { Gavel, Plus, UserMinus, LockKeyhole, LockKeyholeOpen } from 'lucide-react';
import { memo, useCallback, useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Dialog } from '../dialogs/dialogs';
import { RoleBadge } from '../role-badge';
import { useModViewContext } from './context';
import { useCan } from '@/features/server/hooks';

const DELETED_USER_IDENTITY = '__deleted_user__';

const Header = memo(() => {
  const ownUserId = useOwnUserId();
  const { user, refetch } = useModViewContext();
  const status = useUserStatus(user.id);
  const userRoles = useUserRoles(user.id);
  const isDeletedPlaceholder =
    user.identity === DELETED_USER_IDENTITY ||
    (user.name === 'Deleted' && user.banned);

  const isFromOwnUser = useIsOwnUser(user.id);
  const [name, setName] = useState(user.name);
  const can = useCan();

  useEffect(() => {
    setName(user.name);
  }, [user.name]);

  const canManage = useMemo(
    () => can(Permission.MANAGE_USERS) || (isFromOwnUser && !user.lockedUsername),
    [can, isFromOwnUser]
  );

  const onChangedUsername = useCallback(
    async (userId: number, newName: string) => {
      const trpc = getTRPCClient();

      if (isEmptyMessage(newName)) {
        toast.error('Invalid Username');
        refetch();
        return;
      }

      try {
        await trpc.users.update.mutate({
          name: newName,
          userId: userId
        });
        toast.success('Username updated');
      } catch (error) {
        toast.error(getTrpcError(error, 'Failed to update user'));
      } finally {
        refetch();
      }
    },
    [refetch, useUsers]
  );

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
    if (isDeletedPlaceholder) {
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
  }, [user.id, refetch, isDeletedPlaceholder]);

  const onUnban = useCallback(async () => {
    if (isDeletedPlaceholder) {
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
  }, [user.id, refetch, isDeletedPlaceholder]);

  const onUnlockUsername = useCallback(async () => {
    const trpc = getTRPCClient();

    const answer = await requestConfirmation({
      title: 'Unlock Username',
      message: 'Are you sure you want to unlock this Users Username?',
      confirmLabel: 'Unlock'
    });

    if (!answer) {
      return;
    }

    try {
      await trpc.users.lockUsername.mutate({
        userId: user.id,
        isLocked: false
      });
      toast.success('Username unlocked successfully');
    } catch (error) {
      toast.error(getTrpcError(error, 'Failed to unlock username'));
    } finally {
      refetch();
    }
  }, [user.id, refetch]);

const onLockUsername = useCallback(async () => {
    const trpc = getTRPCClient();

    const answer = await requestConfirmation({
      title: 'Lock Username',
      message: 'Are you sure you want to lock this Users Username?',
      confirmLabel: 'Lock'
    });

    if (!answer) {
      return;
    }

    try {
      await trpc.users.lockUsername.mutate({
        userId: user.id,
        isLocked: true
      });
      toast.success('Username locked successfully');
    } catch (error) {
      toast.error(getTrpcError(error, 'Failed to lock username'));
    } finally {
      refetch();
    }
  }, [user.id, refetch]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <UserAvatar userId={user.id} className="h-12 w-12" />
        <input
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          maxLength='24'
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (e.currentTarget as HTMLInputElement).blur();
              onChangedUsername(user.id, e.currentTarget.value);
            }
          }}
          disabled={!canManage}
          className="text-lg font-bold text-foreground bg-transparent border-none p-0 focus:outline-none"
        />
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
          disabled={user.id === ownUserId || isDeletedPlaceholder}
        >
          <Gavel className="h-4 w-4" />
          {user.banned ? 'Unban' : 'Ban'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => (user.lockedUsername ? onUnlockUsername() : onLockUsername())}
        >
          {user.lockedUsername ? (
            <>
              <LockKeyhole className="h-4 w-4" />Unlock Username
            </>
          ) : (
            <>
              <LockKeyholeOpen className="h-4 w-4" />Lock Username
            </>
          )}
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
          disabled={isDeletedPlaceholder}
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
