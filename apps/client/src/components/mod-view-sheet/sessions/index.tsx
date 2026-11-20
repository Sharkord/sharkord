import {
  SessionBody,
  SessionHeader,
  SessionSummary
} from '@/components/session-info';
import { useSessionOpen } from '@/components/session-info/hooks/use-session-open';
import { UserAvatar } from '@/components/user-avatar';
import { setModViewOpen } from '@/features/app/actions';
import { requestTextInput } from '@/features/dialogs/actions';
import {
  useAdminUserSessions,
  type TAdminUserSession
} from '@/features/server/admin/hooks';
import { useUserById } from '@/features/server/users/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError } from '@sharkord/shared';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip
} from '@sharkord/ui';
import { MonitorSmartphone, RefreshCw, Users } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useModViewContext } from '../context';

type TSessionProps = {
  session: TAdminUserSession;
};

const SharedIpBadge = memo(({ session }: TSessionProps) => {
  const { t } = useTranslation('settings');

  if (session.sharedIpUserIds.length === 0) {
    return null;
  }

  return (
    <Tooltip
      content={t('sessionSharedIpCount', {
        count: session.sharedIpUserIds.length
      })}
    >
      <Users className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
    </Tooltip>
  );
});

type TSharedIpUserProps = {
  userId: number;
};

const SharedIpUser = memo(({ userId }: TSharedIpUserProps) => {
  const { t } = useTranslation('settings');
  const user = useUserById(userId);

  const onClick = useCallback(() => {
    setModViewOpen(true, userId);
  }, [userId]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-left text-sm transition-colors hover:bg-accent"
    >
      <UserAvatar userId={userId} className="h-5 w-5" />
      <span className="truncate">{user?.name ?? t('unknownValue')}</span>
    </button>
  );
});

const SharedIpUsers = memo(({ session }: TSessionProps) => {
  const { t } = useTranslation('settings');

  if (session.sharedIpUserIds.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1 rounded-md border border-yellow-500/40 bg-yellow-500/5 p-2">
      <div className="flex items-center gap-2 px-1 text-xs font-medium text-yellow-500">
        <Users className="h-3.5 w-3.5" />
        {t('sessionSharedIpTitle')}
      </div>
      {session.sharedIpUserIds.map((userId) => (
        <SharedIpUser key={userId} userId={userId} />
      ))}
    </div>
  );
});

type TSessionItemProps = TSessionProps & {
  refetch: () => Promise<void>;
};

const Session = memo(({ session, refetch }: TSessionItemProps) => {
  const { t } = useTranslation('settings');
  const { userId } = useModViewContext();
  const { open, onOpenChange } = useSessionOpen(refetch);

  const onDisconnect = useCallback(async () => {
    onOpenChange(false);

    const reason = await requestTextInput({
      title: t('disconnectSessionTitle'),
      message: t('disconnectSessionMsg'),
      confirmLabel: t('disconnectSessionConfirm'),
      allowEmpty: true
    });

    if (reason === null) {
      return;
    }

    try {
      const trpc = getTRPCClient();

      await trpc.users.disconnectSession.mutate({
        userId,
        sessionId: session.id,
        reason
      });
      toast.success(t('sessionDisconnectedSuccess'));
    } catch (error) {
      toast.error(getTrpcError(error, t('failedDisconnectSession')));
    } finally {
      refetch();
    }
  }, [userId, session.id, refetch, onOpenChange, t]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-2 rounded-md p-1 text-left transition-colors hover:bg-accent"
        >
          <SessionSummary session={session} open={open}>
            <SharedIpBadge session={session} />
          </SessionSummary>
        </button>
      </PopoverTrigger>
      <PopoverContent side="left" align="start" className="w-96 space-y-3">
        <SessionHeader session={session}>
          <SharedIpBadge session={session} />
        </SessionHeader>
        <div className="border-t border-border" />
        <SessionBody session={session} onDisconnect={onDisconnect}>
          <SharedIpUsers session={session} />
        </SessionBody>
      </PopoverContent>
    </Popover>
  );
});

const Sessions = memo(() => {
  const { t } = useTranslation('settings');
  const { userId } = useModViewContext();
  const { sessions, loading, refetch } = useAdminUserSessions(userId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MonitorSmartphone className="h-5 w-5" />
          {t('modViewSessionsTitle')}
          <Badge variant="secondary">{sessions.length}</Badge>
          <Tooltip content={t('sessionsRefresh')}>
            <IconButton
              role="button"
              onClick={refetch}
              className="ml-auto inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded bg-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none"
              icon={RefreshCw}
            />
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {!loading && sessions.length === 0 && (
          <p className="px-1 text-sm text-muted-foreground">
            {t('modViewNoSessions')}
          </p>
        )}
        {sessions.map((session) => (
          <Session key={session.id} session={session} refetch={refetch} />
        ))}
      </CardContent>
    </Card>
  );
});

export { Sessions };
