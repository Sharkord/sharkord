import { RelativeTime } from '@/components/relative-time';
import { UserAvatar } from '@/components/user-avatar';
import { setModViewOpen } from '@/features/app/actions';
import { requestTextInput } from '@/features/dialogs/actions';
import {
  useAdminUserSessions,
  type TAdminUserSession
} from '@/features/server/admin/hooks';
import { useChannelById } from '@/features/server/channels/hooks';
import { useUserById } from '@/features/server/users/hooks';
import { useDateLocale } from '@/hooks/use-date-locale';
import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError } from '@sharkord/shared';
import {
  Badge,
  Button,
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
import { format } from 'date-fns';
import {
  Activity,
  AppWindow,
  Building2,
  CalendarClock,
  ChevronRight,
  Clock,
  FileCode,
  Headphones,
  Laptop,
  MapPin,
  MonitorSmartphone,
  Network,
  Package,
  RefreshCw,
  Unplug,
  Users
} from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useModViewContext } from '../context';
import { Row } from '../row';
import { getLocationLabel, getSessionIcon } from './helpers';

type TSessionProps = {
  session: TAdminUserSession;
};

type TSessionHeaderProps = TSessionProps & {
  title: string;
};

const SessionHeader = memo(({ session, title }: TSessionHeaderProps) => {
  const { t } = useTranslation('settings');
  const DeviceIcon = getSessionIcon(session);
  const sharesIp = session.sharedIpUserIds.length > 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <DeviceIcon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{title}</span>
          {session.voiceChannelId !== null && (
            <Tooltip content={t('sessionInVoice')}>
              <Headphones className="h-3.5 w-3.5 shrink-0 text-green-500" />
            </Tooltip>
          )}
          {sharesIp && (
            <Tooltip
              content={t('sessionSharedIpCount', {
                count: session.sharedIpUserIds.length
              })}
            >
              <Users className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
            </Tooltip>
          )}
        </div>
        <RelativeTime date={new Date(session.lastActiveAt)}>
          {(time) => (
            <div className="truncate text-xs text-muted-foreground">
              {session.os && `${session.os} · `}
              {t('sessionActiveAgo', { time })}
            </div>
          )}
        </RelativeTime>
      </div>
    </div>
  );
});

type TVoiceChannelRowProps = {
  channelId: number;
};

const VoiceChannelRow = memo(({ channelId }: TVoiceChannelRowProps) => {
  const { t } = useTranslation('settings');
  const channel = useChannelById(channelId);

  return (
    <Row
      icon={Headphones}
      label={t('sessionVoiceChannelLabel')}
      value={channel?.name ?? t('unknownValue')}
    />
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

const SessionDetails = memo(({ session }: TSessionProps) => {
  const { t } = useTranslation('settings');
  const dateLocale = useDateLocale();
  const unknown = t('unknownValue');
  const { location } = session;

  return (
    <div>
      <Row
        icon={Laptop}
        label={t('sessionOsLabel')}
        value={session.os ?? unknown}
      />
      <Row
        icon={MonitorSmartphone}
        label={t('sessionDeviceLabel')}
        value={session.device ?? unknown}
      />
      <Row
        icon={AppWindow}
        label={t('sessionBrowserLabel')}
        value={session.browser ?? unknown}
      />
      <Row
        icon={Package}
        label={t('sessionClientVersionLabel')}
        value={session.clientVersion ? `v${session.clientVersion}` : unknown}
      />
      {session.desktopVersion && (
        <Row
          icon={AppWindow}
          label={t('sessionDesktopVersionLabel')}
          value={`v${session.desktopVersion}`}
        />
      )}
      {session.voiceChannelId !== null && (
        <VoiceChannelRow channelId={session.voiceChannelId} />
      )}
      {session.ip && (
        <Row
          icon={Network}
          label={t('ipAddressLabel')}
          value={session.ip}
          hidden
        />
      )}
      {location && (
        <>
          <Row
            icon={MapPin}
            label={t('locationLabel')}
            value={getLocationLabel(location) || unknown}
            hidden
          />
          <Row
            icon={Building2}
            label={t('sessionIspLabel')}
            value={location.org ?? unknown}
            details={location.org ?? undefined}
            hidden
          />
          <Row
            icon={Clock}
            label={t('sessionTimezoneLabel')}
            value={location.timezone ?? unknown}
          />
        </>
      )}
      <Row
        icon={CalendarClock}
        label={t('sessionConnectedAtLabel')}
        value={format(session.connectedAt, 'PPp', { locale: dateLocale })}
        details={format(session.connectedAt, 'PPpp', { locale: dateLocale })}
      />
      <Row
        icon={Activity}
        label={t('sessionLastActiveLabel')}
        value={format(session.lastActiveAt, 'PPp', { locale: dateLocale })}
        details={format(session.lastActiveAt, 'PPpp', { locale: dateLocale })}
      />
      <Row
        icon={FileCode}
        label={t('sessionUserAgentLabel')}
        value={session.userAgent ?? unknown}
        details={session.userAgent ?? undefined}
      />
    </div>
  );
});

type TSessionItemProps = TSessionProps & {
  refetch: () => Promise<void>;
};

const Session = memo(({ session, refetch }: TSessionItemProps) => {
  const { t } = useTranslation('settings');
  const { userId } = useModViewContext();
  const [open, setOpen] = useState(false);

  let title = session.browser ?? t('unknownValue');

  if (session.desktopVersion) {
    title = `${t('sessionDesktopApp')} v${session.desktopVersion}`;
  }

  // refreshed on open, so the details are current without polling
  const onOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);

      if (nextOpen) {
        refetch();
      }
    },
    [refetch]
  );

  const onDisconnect = useCallback(async () => {
    setOpen(false);

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
  }, [userId, session.id, refetch, t]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-2 rounded-md p-1 text-left transition-colors hover:bg-accent"
        >
          <div className="min-w-0 flex-1">
            <SessionHeader session={session} title={title} />
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="left" align="start" className="w-96 space-y-3">
        <SessionHeader session={session} title={title} />
        <div className="border-t border-border" />
        <SessionDetails session={session} />
        <SharedIpUsers session={session} />
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={onDisconnect}
        >
          <Unplug />
          {t('disconnectSessionConfirm')}
        </Button>
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
