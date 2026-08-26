import { Dialog } from '@/components/dialogs/dialogs';
import { logDebug } from '@/helpers/browser-logger';
import { getHostFromServer } from '@/helpers/get-file-url';
import { playSound } from '@/helpers/sounds';
import { pushVoiceDebugEvent } from '@/helpers/voice-debug';
import { i18n } from '@/i18n';
import { cleanup, connectToTRPC, getTRPCClient } from '@/lib/trpc';
import type { TMessageJumpToTarget } from '@/types';
import { type TPublicServerSettings, type TServerInfo } from '@sharkord/shared';
import { TRPCClientError } from '@trpc/client';
import { toast } from 'sonner';
import { appSliceActions } from '../app/slice';
import { openDialog } from '../dialogs/actions';
import { store } from '../store';
import {
  channelReadStateByIdSelector,
  currentVoiceChannelIdSelector,
  isChannelTextVisibleByIdSelector
} from './channels/selectors';
import {
  processPluginComponents,
  setPluginCommands,
  setPluginComponents
} from './plugins/actions';
import { connectedSelector, infoSelector } from './selectors';
import { serverSliceActions } from './slice';
import { SoundType, type TDisconnectInfo } from './types';

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

export const setDmsOpen = (open: boolean) => {
  store.dispatch(serverSliceActions.setDmsOpen(open));
};

export const setPublicServerSettings = (
  settings: TPublicServerSettings | undefined
) => {
  store.dispatch(serverSliceActions.setPublicSettings(settings));
};

export const setInfo = (info: TServerInfo | undefined) => {
  store.dispatch(serverSliceActions.setInfo(info));
};

export const setActiveFullscreenPluginId = (pluginId: string | undefined) => {
  store.dispatch(serverSliceActions.setActiveFullscreenPluginId(pluginId));
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

  const { showWelcomeDialog } = await joinServer(handshakeHash);

  if (showWelcomeDialog) {
    openDialog(Dialog.WELCOME_PROFILE_SETUP);
  }
};

export const joinServer = async (handshakeHash: string, password?: string) => {
  const trpc = getTRPCClient();
  const data = await trpc.others.joinServer.query({ handshakeHash, password });

  logDebug('joinServer', data);

  const { initSubscriptions } = await import('./subscriptions');

  try {
    unsubscribeFromServer?.();
  } catch (error) {
    logDebug('failed to unsubscribe stale subscriptions', error);
  }

  unsubscribeFromServer = initSubscriptions();

  store.dispatch(serverSliceActions.setInitialData(data));

  setPluginCommands(data.commands);

  const components = await processPluginComponents(
    data.pluginIdsWithComponents
  );

  setPluginComponents(components);

  return {
    showWelcomeDialog: data.showWelcomeDialog
  };
};

export const disconnectFromServer = () => {
  cleanup();
  unsubscribeFromServer?.();
};

const RECONNECT_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 8_000];

let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDisconnectInfo: TDisconnectInfo | undefined;

export const cancelReconnect = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  reconnectAttempt = 0;
  reconnectDisconnectInfo = undefined;
};

const abandonReconnect = () => {
  const info = reconnectDisconnectInfo;

  cleanup();
  setDisconnectInfo(info);
  playSound(SoundType.SERVER_DISCONNECTED);
};

// a reconnected socket starts unauthenticated: the server only sets ctx.authenticated and
// tracks the user in joinServer, and every subscription sits behind that. so recovering a
// dropped connection means replaying the whole join, not just reopening the transport.
export const reconnectToServer = (info: TDisconnectInfo) => {
  if (reconnectTimer) return;

  const state = store.getState();

  if (reconnectAttempt === 0 && !connectedSelector(state)) {
    setConnected(false);
    cleanup();

    return;
  }

  setConnected(false);

  reconnectDisconnectInfo = info;

  const delay = RECONNECT_DELAYS_MS[reconnectAttempt];

  if (delay === undefined) {
    abandonReconnect();
    return;
  }

  reconnectAttempt += 1;

  pushVoiceDebugEvent('ws', 'reconnect scheduled', {
    attempt: reconnectAttempt,
    delay,
    code: info.code,
    reason: info.reason
  });

  store.dispatch(
    serverSliceActions.setReconnect({
      attempt: reconnectAttempt,
      maxAttempts: RECONNECT_DELAYS_MS.length,
      nextAttemptAt: Date.now() + delay
    })
  );

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;

    store.dispatch(
      serverSliceActions.setReconnect({
        attempt: reconnectAttempt,
        maxAttempts: RECONNECT_DELAYS_MS.length,
        nextAttemptAt: null
      })
    );

    try {
      // connect() opens the password dialog instead of joining when the server asks for one,
      // so reconnecting stays true until setInitialData clears it
      await connect();
      cancelReconnect();

      pushVoiceDebugEvent('ws', 'reconnected', {
        voiceChannelId: currentVoiceChannelIdSelector(store.getState())
      });
    } catch (error) {
      logDebug('reconnect attempt failed', error);

      pushVoiceDebugEvent('error', 'reconnect attempt failed', {
        error: String(error)
      });

      const isAuthFailure =
        error instanceof TRPCClientError &&
        (error.data?.code === 'UNAUTHORIZED' ||
          error.data?.code === 'FORBIDDEN');

      if (isAuthFailure) {
        abandonReconnect();
        return;
      }

      reconnectToServer(info);
    }
  }, delay);
};

export const jumpToMessage = (target: TMessageJumpToTarget) => {
  store.dispatch(appSliceActions.setMessageJumpTarget(target));

  if (target.isDm) {
    setDmsOpen(true);
    store.dispatch(appSliceActions.setSelectedDmChannelId(target.channelId));

    return;
  }

  setDmsOpen(false);
  store.dispatch(appSliceActions.setSelectedDmChannelId(undefined));
  store.dispatch(serverSliceActions.setSelectedChannelId(target.channelId));

  const state = store.getState();

  if (isChannelTextVisibleByIdSelector(state, target.channelId)) {
    markChannelAsRead(target.channelId);
  }
};

export const markChannelAsRead = async (
  channelId: number,
  force: boolean = false
) => {
  const state = store.getState();
  const unreadCount = channelReadStateByIdSelector(state, channelId);

  if (!force && unreadCount === 0) {
    return;
  }

  if (unreadCount > 0) {
    store.dispatch(
      serverSliceActions.setChannelReadState({ channelId, count: 0 })
    );
  }

  try {
    // inside the try: getTRPCClient throws while a reconnect holds no client, and every
    // caller here dispatches rather than awaits, so it surfaces as an unhandled rejection
    // with the optimistic zero left behind
    await getTRPCClient().channels.markAsRead.mutate({ channelId });
  } catch {
    if (unreadCount > 0) {
      store.dispatch(
        serverSliceActions.setChannelReadState({
          channelId,
          count: unreadCount
        })
      );
    }
  }
};

window.useToken = async (token: string) => {
  const trpc = getTRPCClient();

  try {
    await trpc.others.useSecretToken.mutate({ token });

    toast.success(i18n.t('common:nowServerOwner'));
  } catch {
    toast.error(i18n.t('common:invalidAccessToken'));
  }
};

window.sharkordDebug = {
  ...window.sharkordDebug,
  openSoundsModal: () => openDialog(Dialog.SOUNDS)
};
