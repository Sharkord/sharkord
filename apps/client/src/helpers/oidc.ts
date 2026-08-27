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

const startOidcLogin = () => {
  suppressOidcAutoRedirect();

  window.location.href = `${getUrlFromServer()}/oidc/login`;
};

export {
  isOidcAutoRedirectSuppressed,
  startOidcLogin,
  suppressOidcAutoRedirect
};
