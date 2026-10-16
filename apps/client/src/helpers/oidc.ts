import { getUrlFromServer } from './get-file-url';
import {
  getSessionStorageItem,
  SessionStorageKey,
  setSessionStorageItem
} from './storage';

const isOidcAutoRedirectSuppressed = () =>
  getSessionStorageItem(SessionStorageKey.OIDC_NO_AUTO_REDIRECT) === 'true';

const suppressOidcAutoRedirect = () =>
  setSessionStorageItem(SessionStorageKey.OIDC_NO_AUTO_REDIRECT, 'true');

const getOidcHandoffCode = () =>
  new URLSearchParams(window.location.hash.slice(1)).get('oidc');

const startOidcLogin = () => {
  suppressOidcAutoRedirect();

  const invite = new URLSearchParams(window.location.search).get('invite');
  const query = invite ? `?${new URLSearchParams({ invite })}` : '';

  window.location.href = `${getUrlFromServer()}/oidc/login${query}`;
};

export {
  getOidcHandoffCode,
  isOidcAutoRedirectSuppressed,
  startOidcLogin,
  suppressOidcAutoRedirect
};
