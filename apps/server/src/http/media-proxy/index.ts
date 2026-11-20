import { RateLimiter } from '@sharkord/shared';
import http from 'http';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import type { ReadableStream } from 'stream/web';
import { getSettings } from '../../db/queries/server';
import type { getWsInfo } from '../../helpers/get-ws-info';
import { INLINE_MIME_TYPES } from '../../helpers/inline-mime-types';
import { MEDIA_PROXY_PATH, verifyMediaUrl } from '../../helpers/media-proxy';
import { getRateLimit } from '../../helpers/rate-limits';
import { logger } from '../../logger';
import { createRateLimiter } from '../../utils/rate-limiters/rate-limiter';
import { enforceHttpRateLimit, sendJsonError } from '../helpers';
import {
  createSizeLimiter,
  fetchPublicMedia,
  getMimeType,
  getTotalSize
} from './helpers';

const mediaProxyRateLimiter = createRateLimiter({
  getLimit: () => getRateLimit(RateLimiter.MEDIA_PROXY)
});

const mediaProxyRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  { url, info }: { url: URL; info: ReturnType<typeof getWsInfo> }
) => {
  const allowed = enforceHttpRateLimit(res, mediaProxyRateLimiter, info?.ip, {
    route: MEDIA_PROXY_PATH,
    message: 'Too many media requests. Please try again shortly.'
  });

  if (!allowed) return;

  const {
    storageMediaProxyEnabled,
    storageMediaProxyMaxSize,
    storageMediaProxyTimeoutSeconds,
    storageMediaProxyCacheSeconds,
    storageMediaProxyMaxRedirects
  } = await getSettings();

  if (!storageMediaProxyEnabled) {
    sendJsonError(res, 404, 'Not found');

    return;
  }

  const mediaUrl = url.searchParams.get('url');
  const signature = url.searchParams.get('signature');

  if (!mediaUrl || !signature || !verifyMediaUrl(mediaUrl, signature)) {
    sendJsonError(res, 403, 'Forbidden');

    return;
  }

  const controller = new AbortController();

  res.on('close', () => controller.abort());

  const headersTimeout = setTimeout(
    () => controller.abort(),
    storageMediaProxyTimeoutSeconds * 1000
  );

  let upstream: Response | undefined;

  try {
    upstream = await fetchPublicMedia(
      mediaUrl,
      req.headers.range,
      storageMediaProxyMaxRedirects,
      controller.signal
    );
  } catch {
    upstream = undefined;
  } finally {
    clearTimeout(headersTimeout);
  }

  if (!upstream) {
    sendJsonError(res, 502, 'Could not load media');

    return;
  }

  const isOk = upstream.status === 200 || upstream.status === 206;
  const mimeType = getMimeType(upstream.headers.get('content-type'));
  const totalSize = getTotalSize(upstream.headers);
  const { body } = upstream;

  if (!isOk || !body) {
    await body?.cancel();
    sendJsonError(res, 502, 'Could not load media');

    return;
  }

  if (!INLINE_MIME_TYPES.includes(mimeType)) {
    await body.cancel();
    sendJsonError(res, 415, 'Unsupported media type');

    return;
  }

  if (totalSize !== undefined && totalSize > storageMediaProxyMaxSize) {
    await body.cancel();
    sendJsonError(res, 413, 'Media is too large');

    return;
  }

  const headers: http.OutgoingHttpHeaders = {
    'Content-Type': mimeType,
    'Cache-Control': `public, max-age=${storageMediaProxyCacheSeconds}`,
    'Content-Security-Policy': "default-src 'none'; sandbox"
  };

  for (const name of ['content-length', 'content-range', 'accept-ranges']) {
    const value = upstream.headers.get(name);

    if (value) headers[name] = value;
  }

  res.writeHead(upstream.status, headers);

  try {
    await pipeline(
      Readable.fromWeb(body as ReadableStream),
      createSizeLimiter(storageMediaProxyMaxSize),
      res
    );
  } catch (error) {
    logger.debug('Media proxy stream ended early: %s', error);
    res.destroy();
  }
};

export { mediaProxyRouteHandler };
