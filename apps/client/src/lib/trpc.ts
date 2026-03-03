import { resetApp } from '@/features/app/actions';
import { resetDialogs } from '@/features/dialogs/actions';
import { resetServerScreens } from '@/features/server-screens/actions';
import { resetServerState, setDisconnectInfo } from '@/features/server/actions';
import {
  getSessionStorageItem,
  LocalStorageKey,
  removeLocalStorageItem,
  removeSessionStorageItem,
  SessionStorageKey
} from '@/helpers/storage';
import { type AppRouter, type TConnectionParams } from '@sharkord/shared';
import { createTRPCProxyClient, createWSClient, wsLink } from '@trpc/client';

let wsClient: ReturnType<typeof createWSClient> | null = null;
let trpc: ReturnType<typeof createTRPCProxyClient<AppRouter>> | null = null;
let currentHost: string | null = null;
let isCleaningUp = false;

// Firefox fires WebSocket onClose during page refresh; Chrome does not. When navigating away,
// we must not clear auto-login localStorage or it will be lost on refresh in Firefox.
let isNavigatingAway = false;
window.addEventListener('beforeunload', () => {
  isNavigatingAway = true;
});

const initializeTRPC = (host: string) => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

  wsClient = createWSClient({
    url: `${protocol}://${host}`,
    // @ts-expect-error - the onclose type is not correct in trpc
    onClose: (cause: CloseEvent) => {
      cleanup();

      setDisconnectInfo({
        code: cause.code,
        reason: cause.reason,
        wasClean: cause.wasClean,
        time: new Date()
      });
    },
    connectionParams: async (): Promise<TConnectionParams> => {
      return {
        token: getSessionStorageItem(SessionStorageKey.TOKEN) || ''
      };
    },
    keepAlive: {
      enabled: true,
      intervalMs: 30_000,
      pongTimeoutMs: 5_000
    }
  });

  trpc = createTRPCProxyClient<AppRouter>({
    links: [wsLink({ client: wsClient })]
  });

  currentHost = host;

  return trpc;
};

const connectToTRPC = (host: string) => {
  if (trpc && currentHost === host) {
    return trpc;
  }

  return initializeTRPC(host);
};

const getTRPCClient = () => {
  if (!trpc) {
    throw new Error('TRPC client is not initialized');
  }

  return trpc;
};

const cleanup = () => {
  if (isCleaningUp) {
    return;
  }

  isCleaningUp = true;

  if (wsClient) {
    wsClient.close();
    wsClient = null;
  }

  trpc = null;
  currentHost = null;

  // cleanup can be called due to various reasons (manual disconnect, connection error, auto-login failure, etc).
  // so we remove any persisted auto-login token to prevent auto-login loops.
  // skip this when navigating away (refresh/close) - Firefox fires onClose during refresh, Chrome does not
  if (!isNavigatingAway)
    removeLocalStorageItem(LocalStorageKey.AUTO_LOGIN_TOKEN);

  resetServerScreens();
  resetServerState();
  resetDialogs();
  resetApp();

  removeSessionStorageItem(SessionStorageKey.TOKEN);

  // this should help Firefox users who report that auto login is not consistent
  setTimeout(() => {
    isCleaningUp = false;
  }, 100);
};

export { cleanup, connectToTRPC, getTRPCClient, type AppRouter };
