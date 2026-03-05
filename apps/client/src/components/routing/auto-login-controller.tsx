import { setIsAutoConnecting } from '@/features/app/actions';
import { useIsAppLoading, useIsPluginsLoading } from '@/features/app/hooks';
import { connect } from '@/features/server/actions';
import { useDisconnectInfo, useIsConnected } from '@/features/server/hooks';
import {
  getLocalStorageItem,
  getLocalStorageItemBool,
  LocalStorageKey,
  removeLocalStorageItem,
  SessionStorageKey,
  setLocalStorageItemBool,
  setSessionStorageItem
} from '@/helpers/storage';
import { memo, useEffect, useRef } from 'react';

const AutoLoginController = memo(() => {
  const isConnected = useIsConnected();
  const isAppLoading = useIsAppLoading();
  const isPluginsLoading = useIsPluginsLoading();
  const disconnectInfo = useDisconnectInfo();
  const autoLoginAttempted = useRef(false);

  useEffect(() => {
    if (
      isAppLoading ||
      isPluginsLoading ||
      isConnected ||
      disconnectInfo ||
      autoLoginAttempted.current
    ) {
      // ignore if the app is not done loading, if we're already connected or in the process of connecting
      return;
    }

    const autoLoginEnabled = getLocalStorageItemBool(
      LocalStorageKey.AUTO_LOGIN
    );

    const savedToken = getLocalStorageItem(LocalStorageKey.AUTO_LOGIN_TOKEN);

    if (!autoLoginEnabled || !savedToken) {
      // auto-login not enabled or no token saved, do nothing
      return;
    }

    autoLoginAttempted.current = true;

    setIsAutoConnecting(true);
    setSessionStorageItem(SessionStorageKey.TOKEN, savedToken);

    connect()
      .catch(() => {
        // token expired or invalid clear auto-login state so the user
        // sees the connect screen and can log in manually
        removeLocalStorageItem(LocalStorageKey.AUTO_LOGIN_TOKEN);
        setLocalStorageItemBool(LocalStorageKey.AUTO_LOGIN, false);
      })
      .finally(() => {
        // reset auto-login attempt state so if the user logs out and back in they can try auto-login again
        autoLoginAttempted.current = false;
        setIsAutoConnecting(false);
      });
  }, [isAppLoading, isPluginsLoading, isConnected, disconnectInfo]);

  return null;
});

export { AutoLoginController };
