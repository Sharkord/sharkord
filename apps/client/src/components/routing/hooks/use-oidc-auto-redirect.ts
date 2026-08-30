import { useIsAppLoading, useIsPluginsLoading } from '@/features/app/hooks';
import {
  useDisconnectInfo,
  useInfo,
  useIsConnected
} from '@/features/server/hooks';
import { isOidcAutoRedirectSuppressed, startOidcLogin } from '@/helpers/oidc';
import { getLocalStorageItem, LocalStorageKey } from '@/helpers/storage';
import { useEffect, useRef } from 'react';
import { isHandlingOidcCallback, shouldAutoRedirectToOidc } from '../helpers';

const useOidcAutoRedirect = () => {
  const isConnected = useIsConnected();
  const isAppLoading = useIsAppLoading();
  const isPluginsLoading = useIsPluginsLoading();
  const disconnectInfo = useDisconnectInfo();
  const info = useInfo();
  const redirectAttempted = useRef(false);

  useEffect(() => {
    if (redirectAttempted.current) return;

    const shouldRedirect = shouldAutoRedirectToOidc({
      isAppLoading,
      isPluginsLoading,
      isConnected,
      hasDisconnectInfo: !!disconnectInfo,
      isLocalLoginDisabled: !!info?.oidcDisableLocalLogin,
      hasSavedToken: !!getLocalStorageItem(LocalStorageKey.AUTO_LOGIN_TOKEN),
      isHandlingCallback: isHandlingOidcCallback(
        window.location.search,
        window.location.hash
      ),
      isSuppressed: isOidcAutoRedirectSuppressed()
    });

    if (!shouldRedirect) return;

    redirectAttempted.current = true;

    startOidcLogin();
  }, [isAppLoading, isPluginsLoading, isConnected, disconnectInfo, info]);
};

export { useOidcAutoRedirect };
