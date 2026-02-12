import { Button } from '@/components/ui/button';
import { setDisconnectInfo } from '@/features/server/actions';
import type { TDisconnectInfo } from '@/features/server/types';
import { useLocaleFormat } from '@/hooks/use-locale-format';
import { DisconnectCode } from '@sharkord/shared';
import { AlertCircle, Gavel, RefreshCw, WifiOff } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type TDisconnectedProps = {
  info: TDisconnectInfo;
};

const Disconnected = memo(({ info }: TDisconnectedProps) => {
  const { formatDateTime } = useLocaleFormat();
  const { t } = useTranslation();

  const disconnectType = useMemo(() => {
    const code = info.code;

    if (code === DisconnectCode.KICKED) {
      return {
        icon: <AlertCircle className="h-8 w-8 text-yellow-500" />,
        title: t('disconnected.kickedTitle'),
        message: info.reason || t('disconnected.noReasonProvided'),
        canReconnect: true
      };
    }

    if (code === DisconnectCode.BANNED) {
      return {
        icon: <Gavel className="h-8 w-8 text-red-500" />,
        title: t('disconnected.bannedTitle'),
        message: info.reason || t('disconnected.noReasonProvided'),
        canReconnect: false
      };
    }

    return {
      icon: <WifiOff className="h-8 w-8 text-gray-500" />,
      title: t('disconnected.connectionLostTitle'),
      message: t('disconnected.connectionLostMessage'),
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
            {t('disconnected.goToConnectButton')}
          </Button>
        )}

        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">
            {t('disconnected.details')}
          </summary>
          <div className="mt-2 space-y-1">
            <div>
              {t('disconnected.codeLabel')}: {info.code}
            </div>
            <div>
              {t('disconnected.timeLabel')}: {formatDateTime(info.time)}
            </div>
          </div>
        </details>
      </div>
    </div>
  );
});

export { Disconnected };
