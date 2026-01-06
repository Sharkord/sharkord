import { useIsAppLoading } from '@/features/app/hooks';
import { useDisconnectInfo, useIsConnected } from '@/features/server/hooks';
import { Connect } from '@/screens/connect';
import { Disconnected } from '@/screens/disconnected';
import { LoadingApp } from '@/screens/loading-app';
import { ServerView } from '@/screens/server-view';
import { memo } from 'react';

const Routing = memo(() => {
  const isConnected = useIsConnected();
  const isAppLoading = useIsAppLoading();
  const disconnectInfo = useDisconnectInfo();

  if (isAppLoading) {
    return <LoadingApp />;
  }

  if (!isConnected) {
    if (disconnectInfo) {
      return <Disconnected info={disconnectInfo} />;
    }

    return <Connect />;
  }

  return <ServerView />;
});

export { Routing };
