import { resetApp } from '@/features/app/actions';
import { resetDialogs } from '@/features/dialogs/actions';
import { resetServerScreens } from '@/features/server-screens/actions';
import { resetServerState, setDisconnectInfo } from '@/features/server/actions';
import {
  getSessionStorageItem,
  removeSessionStorageItem,
  SessionStorageKey
} from '@/helpers/storage';
import type { AppRouter, TConnectionParams } from '@sharkord/shared';
import { createTRPCProxyClient, createWSClient, wsLink } from '@trpc/client';

let wsClient: ReturnType<typeof createWSClient> | null = null;
let trpc: ReturnType<typeof createTRPCProxyClient<AppRouter>> | null = null;
let currentHost: string | null = null;

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
  if (wsClient) {
    wsClient.close();
    wsClient = null;
  }

  trpc = null;
  currentHost = null;

  resetServerScreens();
  resetServerState();
  resetDialogs();
  resetApp();

  removeSessionStorageItem(SessionStorageKey.TOKEN);
};

export { cleanup, connectToTRPC, getTRPCClient, type AppRouter };
