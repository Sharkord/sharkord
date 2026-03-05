import {
  useIsAppLoading,
  useIsAutoConnecting,
  useIsPluginsLoading
} from '@/features/app/hooks';
import {
  useDisconnectInfo,
  useIsConnected,
  useServerName
} from '@/features/server/hooks';
import { Connect } from '@/screens/connect';
import { Disconnected } from '@/screens/disconnected';
import { LoadingApp } from '@/screens/loading-app';
import { ServerView } from '@/screens/server-view';
import { DisconnectCode } from '@sharkord/shared';
import { memo, useEffect } from 'react';

const Routing = memo(() => {
  const isConnected = useIsConnected();
  const isAppLoading = useIsAppLoading();
  const isPluginsLoading = useIsPluginsLoading();
  const disconnectInfo = useDisconnectInfo();
  const serverName = useServerName();
  const isAutoConnecting = useIsAutoConnecting();

  useEffect(() => {
    if (isConnected && serverName) {
      document.title = `${serverName} - Sharkord`;
      return;
    }

    document.title = 'Sharkord';
  }, [isConnected, serverName]);

  if (isAppLoading || isPluginsLoading) {
    return (
      <LoadingApp
        text={isAppLoading ? 'Loading Sharkord' : 'Loading Plugins'}
      />
    );
  }

  if (!isConnected) {
    if (isAutoConnecting) {
      return <LoadingApp text="Logging in automatically..." />;
    }

    if (
      disconnectInfo &&
      (!disconnectInfo.wasClean ||
        disconnectInfo.code === DisconnectCode.KICKED ||
        disconnectInfo.code === DisconnectCode.BANNED)
    ) {
      return <Disconnected info={disconnectInfo} />;
    }

    return <Connect />;
  }

  return <ServerView />;
});

export { Routing };
