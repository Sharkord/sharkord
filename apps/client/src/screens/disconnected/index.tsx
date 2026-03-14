import { setDisconnectInfo } from '@/features/server/actions';
import type { TDisconnectInfo } from '@/features/server/types';
import { DisconnectCode } from '@sharkord/shared';
import { Button } from '@sharkord/ui';
import { AlertCircle, Gavel, RefreshCw, WifiOff } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type TDisconnectedProps = {
  info: TDisconnectInfo;
};

const Disconnected = memo(({ info }: TDisconnectedProps) => {
  const { t } = useTranslation('disconnected');

  const disconnectType = useMemo(() => {
    const code = info.code;

    if (code === DisconnectCode.KICKED) {
      return {
        icon: <AlertCircle className="h-8 w-8 text-yellow-500" />,
        title: t('kicked'),
        message: info.reason || t('noReasonProvided'),
        canReconnect: true
      };
    }

    if (code === DisconnectCode.BANNED) {
      return {
        icon: <Gavel className="h-8 w-8 text-red-500" />,
        title: t('banned'),
        message: info.reason || t('noReasonProvided'),
        canReconnect: false
      };
    }

    return {
      icon: <WifiOff className="h-8 w-8 text-gray-500" />,
      title: t('connectionLost'),
      message: t('lostConnectionMessage'),
      canReconnect: true
    };
  }, [info, t]);

  const handleReconnect = useCallback(() => {
    setDisconnectInfo(undefined);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-6 max-w-md px-6">
        <div className="flex justify-center">{disconnectType.icon}</div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            {disconnectType.title}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {disconnectType.message}
          </p>
        </div>

        {disconnectType.canReconnect && (
          <Button
            onClick={handleReconnect}
            className="inline-flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {t('goToConnectScreen')}
          </Button>
        )}

        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">
            {t('details')}
          </summary>
          <div className="mt-2 space-y-1">
            <div>{t('code', { code: info.code })}</div>
            <div>{t('time', { time: info.time.toLocaleString() })}</div>
          </div>
        </details>
      </div>
    </div>
  );
});

export { Disconnected };
