import { store } from '@/features/store';
import { logDebug } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import {
  FILE_TOKEN_REFRESH_GRACE_MS,
  FILE_TOKEN_REFRESH_MAX_FILES,
  type TFileAccessToken
} from '@sharkord/shared';
import { emojisSelector } from '../emojis/selectors';
import { forEachSignedFile } from '../helpers';
import { messagesMapSelector } from '../messages/selectors';
import { serverSliceActions } from '../slice';
import { usersSelector } from '../users/selectors';

const CHECK_INTERVAL_MS = 60_000; // check for expiring file tokens every minute
const REFRESH_MARGIN_MS = 5 * 60_000; // refresh tokens 5 minutes before they expire

let checkInterval: ReturnType<typeof setInterval> | undefined;
let refreshing = false;

const getExpiringFileTokens = () => {
  const state = store.getState();
  const users = usersSelector(state);
  const emojis = emojisSelector(state);
  const messagesMap = messagesMapSelector(state);
  const now = Date.now();
  const expiringById = new Map<number, TFileAccessToken>();

  forEachSignedFile({ users, emojis, messagesMap }, (file) => {
    const token = file._accessToken!;
    const expiresAt = file._accessTokenExpiresAt ?? 0;

    if (expiresAt > now + REFRESH_MARGIN_MS) return; // token is not close to expiring yet

    if (expiresAt < now - FILE_TOKEN_REFRESH_GRACE_MS) return; // token is too old to refresh

    const existing = expiringById.get(file.id);

    if (existing && existing.expiresAt >= expiresAt) return;

    expiringById.set(file.id, { id: file.id, token, expiresAt });
  });

  return [...expiringById.values()].slice(0, FILE_TOKEN_REFRESH_MAX_FILES);
};

const refreshExpiringFileTokens = async () => {
  if (refreshing) return;

  const files = getExpiringFileTokens();

  if (files.length === 0) return;

  refreshing = true;

  try {
    const trpc = getTRPCClient();
    const refreshed = await trpc.files.refreshTokens.mutate({ files });

    store.dispatch(serverSliceActions.refreshFileTokens(refreshed));
  } catch (error) {
    logDebug('failed to refresh file tokens', error);
  } finally {
    refreshing = false;
  }
};

export const startFileTokenRefresh = () => {
  if (checkInterval) return;

  checkInterval = setInterval(refreshExpiringFileTokens, CHECK_INTERVAL_MS);
};

export const stopFileTokenRefresh = () => {
  clearInterval(checkInterval);

  checkInterval = undefined;
};
