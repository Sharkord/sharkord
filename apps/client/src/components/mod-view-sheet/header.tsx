import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import {
  openDialog,
  requestConfirmation,
  requestTextInput
} from '@/features/dialogs/actions';
import { useUserRoles } from '@/features/server/hooks';
import { useOwnUserId, useUserStatus } from '@/features/server/users/hooks';
import { getTrpcError } from '@/helpers/parse-trpc-errors';
import { getTRPCClient } from '@/lib/trpc';
import { UserStatus } from '@sharkord/shared';
import { Gavel, Plus, UserMinus } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Dialog } from '../dialogs/dialogs';
import { RoleBadge } from '../role-badge';
import { useModViewContext } from './context';

const Header = memo(() => {
  const { t } = useTranslation();
  const ownUserId = useOwnUserId();
  const { user, refetch } = useModViewContext();
  const status = useUserStatus(user.id);
  const userRoles = useUserRoles(user.id);

  const onRemoveRole = useCallback(
    async (roleId: number, roleName: string) => {
      const answer = await requestConfirmation({
        title: t('modView.header.removeRoleTitle'),
        message: t('modView.header.removeRoleMessage', {
          roleName,
          userName: user.name
        }),
        confirmLabel: t('modView.header.removeRoleConfirm')
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
        toast.success(t('toasts.roles.removedSuccess'));
      } catch (error) {
        toast.error(getTrpcError(error, t('toasts.roles.removeFailed')));
      } finally {
        refetch();
      }
    },
    [user.id, user.name, refetch, t]
  );

  const onKick = useCallback(async () => {
    const reason = await requestTextInput({
      title: t('modView.header.kickTitle'),
      message: t('modView.header.kickMessage'),
      confirmLabel: t('modView.header.kickConfirm'),
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

      toast.success(t('toasts.moderation.userKickedSuccess'));
    } catch (error) {
      toast.error(getTrpcError(error, t('toasts.moderation.userKickedFailed')));
    } finally {
      refetch();
    }
  }, [user.id, refetch, t]);

  const onBan = useCallback(async () => {
    const trpc = getTRPCClient();

    const reason = await requestTextInput({
      title: t('modView.header.banTitle'),
      message: t('modView.header.banMessage'),
      confirmLabel: t('modView.header.banConfirm'),
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
      toast.success(t('toasts.moderation.userBannedSuccess'));
    } catch (error) {
      toast.error(getTrpcError(error, t('toasts.moderation.userBannedFailed')));
    } finally {
      refetch();
    }
  }, [user.id, refetch, t]);

  const onUnban = useCallback(async () => {
    const trpc = getTRPCClient();

    const answer = await requestConfirmation({
      title: t('modView.header.unbanTitle'),
      message: t('modView.header.unbanMessage'),
      confirmLabel: t('modView.header.unbanConfirm')
    });

    if (!answer) {
      return;
    }

    try {
      await trpc.users.unban.mutate({
        userId: user.id
      });
      toast.success(t('toasts.moderation.userUnbannedSuccess'));
    } catch (error) {
      toast.error(
        getTrpcError(error, t('toasts.moderation.userUnbannedFailed'))
      );
    } finally {
      refetch();
    }
  }, [user.id, refetch, t]);

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
          {t('modView.actions.kick')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => (user.banned ? onUnban() : onBan())}
          disabled={user.id === ownUserId}
        >
          <Gavel className="h-4 w-4" />
          {user.banned ? t('modView.actions.unban') : t('modView.actions.ban')}
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
          onClick={() => openDialog(Dialog.ASSIGN_ROLE, { user, refetch })}
        >
          <Plus className="h-3 w-3" />
          {t('modView.actions.assignRole')}
        </Button>
      </div>
    </div>
  );
});

export { Header };
