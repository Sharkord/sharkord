import { Row } from '@/components/mod-view-sheet/row';
import { RelativeTime } from '@/components/relative-time';
import { useChannelById } from '@/features/server/channels/hooks';
import { useDateLocale } from '@/hooks/use-date-locale';
import { cn } from '@/lib/utils';
import type { TUserSession } from '@sharkord/shared';
import { Button, Tooltip } from '@sharkord/ui';
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
  Unplug
} from 'lucide-react';
import { memo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { getLocationLabel, getSessionIcon } from './helpers';

type TSessionInfoProps = {
  session: TUserSession;
};

type TSessionHeaderProps = TSessionInfoProps & {
  children?: ReactNode;
};

const SessionHeader = memo(({ session, children }: TSessionHeaderProps) => {
  const { t } = useTranslation('settings');
  const DeviceIcon = getSessionIcon(session);

  let title = session.browser ?? t('unknownValue');

  if (session.desktopVersion) {
    title = `${t('sessionDesktopApp')} v${session.desktopVersion}`;
  }

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
          {children}
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
  wide?: boolean;
};

const VoiceChannelRow = memo(({ channelId, wide }: TVoiceChannelRowProps) => {
  const { t } = useTranslation('settings');
  const channel = useChannelById(channelId);

  return (
    <Row
      wide={wide}
      icon={Headphones}
      label={t('sessionVoiceChannelLabel')}
      value={channel?.name ?? t('unknownValue')}
    />
  );
});

type TSessionDetailsProps = TSessionInfoProps & {
  wide?: boolean;
};

const SessionDetails = memo(({ session, wide }: TSessionDetailsProps) => {
  const { t } = useTranslation('settings');
  const dateLocale = useDateLocale();
  const unknown = t('unknownValue');
  const { location } = session;

  return (
    <div>
      <Row
        wide={wide}
        icon={Laptop}
        label={t('sessionOsLabel')}
        value={session.os ?? unknown}
      />
      <Row
        wide={wide}
        icon={MonitorSmartphone}
        label={t('sessionDeviceLabel')}
        value={session.device ?? unknown}
      />
      <Row
        wide={wide}
        icon={AppWindow}
        label={t('sessionBrowserLabel')}
        value={session.browser ?? unknown}
      />
      <Row
        wide={wide}
        icon={Package}
        label={t('sessionClientVersionLabel')}
        value={session.clientVersion ? `v${session.clientVersion}` : unknown}
      />
      {session.desktopVersion && (
        <Row
          wide={wide}
          icon={AppWindow}
          label={t('sessionDesktopVersionLabel')}
          value={`v${session.desktopVersion}`}
        />
      )}
      {session.voiceChannelId !== null && (
        <VoiceChannelRow channelId={session.voiceChannelId} wide={wide} />
      )}
      {session.ip && (
        <Row
          wide={wide}
          icon={Network}
          label={t('ipAddressLabel')}
          value={session.ip}
          hidden
        />
      )}
      {location && (
        <>
          <Row
            wide={wide}
            icon={MapPin}
            label={t('locationLabel')}
            value={getLocationLabel(location) || unknown}
            hidden
          />
          <Row
            wide={wide}
            icon={Building2}
            label={t('sessionIspLabel')}
            value={location.org ?? unknown}
            details={location.org ?? undefined}
            hidden
          />
          <Row
            wide={wide}
            icon={Clock}
            label={t('sessionTimezoneLabel')}
            value={location.timezone ?? unknown}
          />
        </>
      )}
      <Row
        wide={wide}
        icon={CalendarClock}
        label={t('sessionConnectedAtLabel')}
        value={format(session.connectedAt, 'PPp', { locale: dateLocale })}
        details={format(session.connectedAt, 'PPpp', { locale: dateLocale })}
      />
      <Row
        wide={wide}
        icon={Activity}
        label={t('sessionLastActiveLabel')}
        value={format(session.lastActiveAt, 'PPp', { locale: dateLocale })}
        details={format(session.lastActiveAt, 'PPpp', { locale: dateLocale })}
      />
      <Row
        wide={wide}
        icon={FileCode}
        label={t('sessionUserAgentLabel')}
        value={session.userAgent ?? unknown}
        details={session.userAgent ?? undefined}
      />
    </div>
  );
});

type TSessionSummaryProps = TSessionHeaderProps & {
  open: boolean;
};

const SessionSummary = memo(
  ({ session, open, children }: TSessionSummaryProps) => (
    <>
      <div className="min-w-0 flex-1">
        <SessionHeader session={session}>{children}</SessionHeader>
      </div>
      <ChevronRight
        className={cn(
          'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
          open && 'rotate-90'
        )}
      />
    </>
  )
);

type TSessionBodyProps = TSessionHeaderProps & {
  onDisconnect?: () => void;
  wide?: boolean;
};

const SessionBody = memo(
  ({ session, onDisconnect, wide, children }: TSessionBodyProps) => {
    const { t } = useTranslation('settings');

    return (
      <div className="space-y-3">
        <SessionDetails session={session} wide={wide} />
        {children}
        {onDisconnect && (
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={onDisconnect}
          >
            <Unplug />
            {t('disconnectSessionConfirm')}
          </Button>
        )}
      </div>
    );
  }
);

export { SessionBody, SessionHeader, SessionSummary };
