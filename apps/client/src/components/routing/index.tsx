import { useIsAppLoading, useIsPluginsLoading } from '@/features/app/hooks';
import { connect } from '@/features/server/actions';
import {
  useDisconnectInfo,
  useIsConnected,
  useServerName
} from '@/features/server/hooks';
import {
  getLocalStorageItem,
  getLocalStorageItemBool,
  LocalStorageKey,
  removeLocalStorageItem,
  SessionStorageKey,
  setLocalStorageItemBool,
  setSessionStorageItem
} from '@/helpers/storage';
import { Connect } from '@/screens/connect';
import { Disconnected } from '@/screens/disconnected';
import { LoadingApp } from '@/screens/loading-app';
import { ServerView } from '@/screens/server-view';
import { DisconnectCode } from '@sharkord/shared';
import { memo, useEffect, useRef, useState } from 'react';

const Routing = memo(() => {
  const isConnected = useIsConnected();
  const isAppLoading = useIsAppLoading();
  const isPluginsLoading = useIsPluginsLoading();
  const disconnectInfo = useDisconnectInfo();
  const serverName = useServerName();
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  const autoLoginAttempted = useRef(false);

  useEffect(() => {
    if (isConnected && serverName) {
      document.title = `${serverName} - Sharkord`;
      return;
    }

    document.title = 'Sharkord';
  }, [isConnected, serverName]);

  // auto-login: restore persisted token and connect automatically
  useEffect(() => {
    if (
      isAppLoading ||
      isPluginsLoading ||
      isConnected ||
      disconnectInfo ||
      autoLoginAttempted.current
    ) {
      return;
    }

    const autoLoginEnabled = getLocalStorageItemBool(
      LocalStorageKey.AUTO_LOGIN
    );

    const savedToken = getLocalStorageItem(LocalStorageKey.AUTO_LOGIN_TOKEN);

    if (!autoLoginEnabled || !savedToken) {
      return;
    }

    autoLoginAttempted.current = true;

    setIsAutoConnecting(true);
    setSessionStorageItem(SessionStorageKey.TOKEN, savedToken);

    connect().catch(() => {
      // token expired or invalid — clear auto-login state so the user
      // sees the connect screen and can log in manually
      removeLocalStorageItem(LocalStorageKey.AUTO_LOGIN_TOKEN);
      setLocalStorageItemBool(LocalStorageKey.AUTO_LOGIN, false);
      setIsAutoConnecting(false);
    });
  }, [isAppLoading, isPluginsLoading, isConnected, disconnectInfo]);

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
