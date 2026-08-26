import { disconnectFromServer } from '@/features/server/actions';
import { useReconnectState } from '@/features/server/hooks';
import { Button } from '@sharkord/ui';
import { Loader2, WifiOff } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCountdownSeconds } from './use-countdown-seconds';

const ReconnectingOverlay = memo(() => {
  const { t } = useTranslation('common');
  const reconnect = useReconnectState();
  const secondsLeft = useCountdownSeconds(reconnect?.nextAttemptAt ?? null);

  const handleAbort = useCallback(() => disconnectFromServer(), []);

  if (!reconnect) return null;

  const isAttemptInFlight = reconnect.nextAttemptAt === null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-live="polite"
      className="fixed inset-0 z-40 flex items-center justify-center bg-background/40 backdrop-blur-sm"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-lg border border-border bg-background/95 p-6 text-center shadow-lg">
        <div className="flex size-12 items-center justify-center rounded-full bg-yellow-500/15">
          {isAttemptInFlight ? (
            <Loader2 className="size-6 animate-spin text-yellow-500" />
          ) : (
            <WifiOff className="size-6 text-yellow-500" />
          )}
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold">{t('reconnectingTitle')}</p>
          <p className="text-sm text-muted-foreground">
            {isAttemptInFlight
              ? t('reconnectingNow')
              : t('reconnectingIn', { count: secondsLeft })}
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          {t('reconnectingAttempt', {
            attempt: reconnect.attempt,
            total: reconnect.maxAttempts
          })}
        </p>

        <div
          className="h-1 w-full overflow-hidden rounded-full bg-muted"
          role="presentation"
        >
          <div
            className="h-full bg-yellow-500 transition-all duration-500"
            style={{
              width: `${(reconnect.attempt / reconnect.maxAttempts) * 100}%`
            }}
          />
        </div>

        <p className="text-xs text-muted-foreground">{t('reconnectingHint')}</p>

        <Button variant="ghost" size="sm" onClick={handleAbort}>
          {t('reconnectingAbort')}
        </Button>
      </div>
    </div>
  );
});

export { ReconnectingOverlay };
