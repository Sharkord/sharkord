import { ChannelPermission } from '@sharkord/shared';
import http from 'http';
import path from 'path';
import { channelUserCan } from '../db/queries/channels';
import { assertDmChannel } from '../db/queries/dms';
import { getOpenedViewOnceFile } from '../db/queries/files';
import { getUserByToken } from '../db/queries/users';
import type { getWsInfo } from '../helpers/get-ws-info';
import { PUBLIC_PATH } from '../helpers/paths';
import { getRateLimit } from '../helpers/rate-limits';
import { createRateLimiter } from '../utils/rate-limiters/rate-limiter';
import {
  enforceHttpRateLimit,
  getRequestToken,
  sendFile,
  sendJsonError
} from './helpers';

const VIEW_ONCE_DOWNLOAD_WINDOW_MS = 60 * 1000;

const viewOnceRateLimiter = createRateLimiter({
  getLimit: () => getRateLimit()
});

// the rule assertChannelAccess applies in openViewOnce, which needs a trpc context
const canViewChannel = async (channelId: number, userId: number) => {
  try {
    await assertDmChannel(channelId, userId);
  } catch {
    return false;
  }

  return channelUserCan(channelId, userId, ChannelPermission.VIEW_CHANNEL);
};

const viewOnceRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  { url, info }: { url: URL; info: ReturnType<typeof getWsInfo> }
) => {
  const allowed = enforceHttpRateLimit(res, viewOnceRateLimiter, info?.ip, {
    route: '/view-once',
    message: 'Too many requests. Please try again shortly.'
  });

  if (!allowed) return;

  const match = /^\/view-once\/(\d+)$/.exec(url.pathname);
  const fileId = Number(match?.[1]);
  const user = await getUserByToken(getRequestToken(req));

  const file =
    user && Number.isSafeInteger(fileId) && fileId > 0
      ? await getOpenedViewOnceFile(
          fileId,
          user.id,
          Date.now() - VIEW_ONCE_DOWNLOAD_WINDOW_MS
        )
      : undefined;

  const canView =
    user && file ? await canViewChannel(file.channelId, user.id) : false;

  if (!file || !canView) {
    sendJsonError(res, 404, 'File not found');

    return;
  }

  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  await sendFile(req, res, path.join(PUBLIC_PATH, file.name), {
    cacheControl: 'no-store',
    contentType: file.mimeType,
    contentDisposition: 'inline',
    notFoundMessage: 'File not found'
  });
};

export { VIEW_ONCE_DOWNLOAD_WINDOW_MS, viewOnceRouteHandler };
