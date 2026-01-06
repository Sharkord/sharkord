import { Dialog } from '@/components/dialogs/dialogs';
import { logDebug } from '@/helpers/browser-logger';
import { getHostFromServer } from '@/helpers/get-file-url';
import { cleanup, connectToTRPC, getTRPCClient } from '@/lib/trpc';
import { type TPublicServerSettings, type TServerInfo } from '@sharkord/shared';
import { toast } from 'sonner';
import { openDialog } from '../dialogs/actions';
import { store } from '../store';
import { infoSelector } from './selectors';
import { serverSliceActions } from './slice';
import { initSubscriptions } from './subscriptions';
import { type TDisconnectInfo } from './types';

let unsubscribeFromServer: (() => void) | null = null;

export const setConnected = (status: boolean) => {
  store.dispatch(serverSliceActions.setConnected(status));
};

export const resetServerState = () => {
  store.dispatch(serverSliceActions.resetState());
};

export const setDisconnectInfo = (info: TDisconnectInfo | undefined) => {
  store.dispatch(serverSliceActions.setDisconnectInfo(info));
};

export const setConnecting = (status: boolean) => {
  store.dispatch(serverSliceActions.setConnecting(status));
};

export const setServerId = (id: string) => {
  store.dispatch(serverSliceActions.setServerId(id));
};

export const setPublicServerSettings = (
  settings: TPublicServerSettings | undefined
) => {
  store.dispatch(serverSliceActions.setPublicSettings(settings));
};

export const setInfo = (info: TServerInfo | undefined) => {
  store.dispatch(serverSliceActions.setInfo(info));
};

export const connect = async () => {
  const state = store.getState();
  const info = infoSelector(state);

  if (!info) {
    throw new Error('Failed to fetch server info');
  }

  const { serverId } = info;

  const host = getHostFromServer();
  const trpc = await connectToTRPC(host);

  const { hasPassword, handshakeHash } = await trpc.others.handshake.query();

  if (hasPassword) {
    // show password prompt
    openDialog(Dialog.SERVER_PASSWORD, { handshakeHash, serverId });
    return;
  }

  await joinServer(handshakeHash);
};

export const joinServer = async (handshakeHash: string, password?: string) => {
  const trpc = getTRPCClient();
  const data = await trpc.others.joinServer.query({ handshakeHash, password });

  if (window.DEBUG) {
    logDebug('joinServer', data);
  }

  unsubscribeFromServer = initSubscriptions();

  store.dispatch(serverSliceActions.setInitialData(data));
};

export const disconnectFromServer = () => {
  cleanup();
  unsubscribeFromServer?.();
};

window.useToken = async (token: string) => {
  const trpc = getTRPCClient();

  try {
    await trpc.others.useSecretToken.mutate({ token });

    toast.success('You are now an owner of this server');
  } catch {
    toast.error('Invalid access token');
  }
};
