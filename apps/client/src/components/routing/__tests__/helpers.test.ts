import { describe, expect, test } from 'bun:test';
import {
  getDocumentTitle,
  isHandlingOidcCallback,
  shouldAutoRedirectToOidc,
  type TAutoRedirectState
} from '../helpers';

// the state of a fresh tab hitting a server that only accepts the provider, which is the
// one case that should send the browser away without being asked
const READY: TAutoRedirectState = {
  isAppLoading: false,
  isPluginsLoading: false,
  isConnected: false,
  hasDisconnectInfo: false,
  isLocalLoginDisabled: true,
  hasSavedToken: false,
  isHandlingCallback: false,
  isSuppressed: false
};

describe('shouldAutoRedirectToOidc', () => {
  test('should redirect a fresh tab when local login is disabled', () => {
    expect(shouldAutoRedirectToOidc(READY)).toBe(true);
  });

  test('should never redirect while local login is available', () => {
    expect(
      shouldAutoRedirectToOidc({ ...READY, isLocalLoginDisabled: false })
    ).toBe(false);
  });

  test.each([
    ['the app is still loading', 'isAppLoading'],
    ['plugins are still loading', 'isPluginsLoading'],
    ['the session is already live', 'isConnected'],
    ['a disconnect is being shown', 'hasDisconnectInfo'],
    ['a saved session can be reused', 'hasSavedToken']
  ] as const)('should not redirect when %s', (_, field) => {
    expect(shouldAutoRedirectToOidc({ ...READY, [field]: true })).toBe(false);
  });

  // the loop: the provider sends the browser back, the connect screen strips the url and
  // re-reads /info, and every one of those re-runs the controller. if any of them can
  // redirect again the tab never settles
  test('should not redirect while the callback is being handled', () => {
    expect(
      shouldAutoRedirectToOidc({ ...READY, isHandlingCallback: true })
    ).toBe(false);
  });

  test('should not redirect twice in the same tab', () => {
    expect(shouldAutoRedirectToOidc({ ...READY, isSuppressed: true })).toBe(
      false
    );
  });

  // a failed callback used to slip through: it carries oidc_error rather than oidc, and
  // retrying it automatically is a loop that never terminates
  test('should not redirect after a failed callback', () => {
    expect(
      shouldAutoRedirectToOidc({
        ...READY,
        isHandlingCallback: true,
        isSuppressed: true
      })
    ).toBe(false);
  });
});

describe('isHandlingOidcCallback', () => {
  test('should detect a successful callback', () => {
    expect(isHandlingOidcCallback('?oidc=some-code')).toBe(true);
  });

  test('should detect a failed callback', () => {
    expect(isHandlingOidcCallback('?oidc_error=server_error')).toBe(true);
  });

  test('should ignore unrelated query strings', () => {
    expect(isHandlingOidcCallback('?invite=abc123')).toBe(false);
    expect(isHandlingOidcCallback('')).toBe(false);
  });
});

describe('getDocumentTitle', () => {
  test('should show the server name on its own once connected', () => {
    expect(getDocumentTitle(true, 'My Server', 0)).toBe('My Server');
  });

  test('should append the unread count when there is one', () => {
    expect(getDocumentTitle(true, 'My Server', 5)).toBe('My Server (5)');
  });

  test('should fall back to the app name while disconnected', () => {
    expect(getDocumentTitle(false, 'My Server', 5)).toBe('Sharkord');
  });

  // the name arrives with the join payload, so it is briefly missing on a live connection
  test('should fall back to the app name before the server name arrives', () => {
    expect(getDocumentTitle(true, undefined, 0)).toBe('Sharkord');
  });
});
