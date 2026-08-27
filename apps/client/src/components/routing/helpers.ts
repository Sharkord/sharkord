type TAutoRedirectState = {
  isAppLoading: boolean;
  isPluginsLoading: boolean;
  isConnected: boolean;
  hasDisconnectInfo: boolean;
  isLocalLoginDisabled: boolean;
  hasSavedToken: boolean;
  isHandlingCallback: boolean;
  isSuppressed: boolean;
};

const shouldAutoRedirectToOidc = ({
  isAppLoading,
  isPluginsLoading,
  isConnected,
  hasDisconnectInfo,
  isLocalLoginDisabled,
  hasSavedToken,
  isHandlingCallback,
  isSuppressed
}: TAutoRedirectState): boolean => {
  if (isAppLoading || isPluginsLoading || isConnected || hasDisconnectInfo) {
    return false;
  }

  if (!isLocalLoginDisabled) return false;

  if (hasSavedToken) return false;

  if (isHandlingCallback) return false;

  return !isSuppressed;
};

const isHandlingOidcCallback = (search: string) => {
  const params = new URLSearchParams(search);

  return params.has('oidc') || params.has('oidc_error');
};

const getDocumentTitle = (
  isConnected: boolean,
  serverName: string | undefined,
  unreadCount: number
): string => {
  if (!isConnected || !serverName) return 'Sharkord';

  return unreadCount > 0 ? `${serverName} (${unreadCount})` : serverName;
};

export { getDocumentTitle, isHandlingOidcCallback, shouldAutoRedirectToOidc };
export type { TAutoRedirectState };
