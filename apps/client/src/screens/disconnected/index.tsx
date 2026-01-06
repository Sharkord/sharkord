import { Button } from '@/components/ui/button';
import { setDisconnectInfo } from '@/features/server/actions';
import type { TDisconnectInfo } from '@/features/server/types';
import { DisconnectCode } from '@sharkord/shared';
import { AlertCircle, Gavel, RefreshCw, WifiOff } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';

type TDisconnectedProps = {
  info: TDisconnectInfo;
};

const Disconnected = memo(({ info }: TDisconnectedProps) => {
  const disconnectType = useMemo(() => {
    const code = info.code;

    if (code === DisconnectCode.KICKED) {
      return {
        icon: <AlertCircle className="h-8 w-8 text-yellow-500" />,
        title: 'You have been kicked',
        message: info.reason || 'No reason provided.',
        canReconnect: true
      };
    }

    if (code === DisconnectCode.BANNED) {
      return {
        icon: <Gavel className="h-8 w-8 text-red-500" />,
        title: 'You have been banned',
        message: info.reason || 'No reason provided.',
        canReconnect: false
      };
    }

    return {
      icon: <WifiOff className="h-8 w-8 text-gray-500" />,
      title: 'Connection lost',
      message: 'Lost connection to the server unexpectedly.',
      canReconnect: true
    };
  }, [info]);

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
            Go to Connect Screen
          </Button>
        )}

        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">
            Details
          </summary>
          <div className="mt-2 space-y-1">
            <div>Code: {info.code}</div>
            <div>Time: {info.time.toLocaleString()}</div>
          </div>
        </details>
      </div>
    </div>
  );
});

export { Disconnected };
