import { SessionBody, SessionSummary } from '@/components/session-info';
import { useSessionOpen } from '@/components/session-info/hooks/use-session-open';
import { requestConfirmation } from '@/features/dialogs/actions';
import { getTRPCClient, type TRouterOutputs } from '@/lib/trpc';
import { getTrpcError } from '@sharkord/shared';
import { Badge, IconButton, SettingsSection, Tooltip } from '@sharkord/ui';
import { RefreshCw } from 'lucide-react';
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TOwnSession = TRouterOutputs['users']['getOwnSessions'][number];

type TSessionProps = {
  session: TOwnSession;
  refetch: () => Promise<void>;
};

const Session = memo(({ session, refetch }: TSessionProps) => {
  const { t } = useTranslation('settings');
  const { open, onOpenChange } = useSessionOpen(refetch);

  const onToggle = useCallback(() => {
    onOpenChange(!open);
  }, [open, onOpenChange]);

  const onDisconnect = useCallback(async () => {
    const confirmed = await requestConfirmation({
      title: t('disconnectSessionTitle'),
      message: t('disconnectOwnSessionMsg'),
      confirmLabel: t('disconnectSessionConfirm')
    });

    if (!confirmed) {
      return;
    }

    try {
      const trpc = getTRPCClient();

      await trpc.users.disconnectOwnSession.mutate({ sessionId: session.id });
      toast.success(t('sessionDisconnectedSuccess'));
    } catch (error) {
      toast.error(getTrpcError(error, t('failedDisconnectSession')));
    } finally {
      refetch();
    }
  }, [session.id, refetch, t]);

  return (
    <div className="rounded-md border border-border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 rounded-md p-2 text-left transition-colors hover:bg-accent"
      >
        <SessionSummary session={session} open={open}>
          {session.current && (
            <Badge variant="secondary">{t('sessionCurrent')}</Badge>
          )}
        </SessionSummary>
      </button>
      {open && (
        <div className="border-t border-border p-2">
          <SessionBody
            session={session}
            wide
            onDisconnect={session.current ? undefined : onDisconnect}
          />
        </div>
      )}
    </div>
  );
});

const Sessions = memo(() => {
  const { t } = useTranslation('settings');
  const [sessions, setSessions] = useState<TOwnSession[]>([]);

  const fetchSessions = useCallback(async () => {
    try {
      const trpc = getTRPCClient();
      const ownSessions = await trpc.users.getOwnSessions.query();

      setSessions(ownSessions);
    } catch (error) {
      toast.error(getTrpcError(error, t('failedLoadSessions')));
    }
  }, [t]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return (
    <SettingsSection
      title={t('userSessionsTitle')}
      description={t('userSessionsDesc')}
      action={
        <Tooltip content={t('sessionsRefresh')}>
          <IconButton
            role="button"
            onClick={fetchSessions}
            className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded bg-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none"
            icon={RefreshCw}
          />
        </Tooltip>
      }
    >
      <div className="space-y-2">
        {sessions.map((session) => (
          <Session key={session.id} session={session} refetch={fetchSessions} />
        ))}
      </div>
    </SettingsSection>
  );
});

export { Sessions };
