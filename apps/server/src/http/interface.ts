import { getErrorMessage } from '@sharkord/shared';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { INTERFACE_PATH } from '../helpers/paths';
import { logger } from '../logger';
import { IS_DEVELOPMENT, IS_TEST } from '../utils/env';
import { buildEtag, sendJsonError, sendNotModified } from './helpers';

const interfaceRouteHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  if (IS_DEVELOPMENT && !IS_TEST) {
    res.writeHead(302, { Location: 'http://localhost:5173' });
    res.end();

    return res;
  }

  let subPath = req.url || '/';

  const urlPart = subPath.split('?')[0];

  subPath = urlPart ? decodeURIComponent(urlPart) : '/';
  subPath = subPath === '/' ? 'index.html' : subPath;

  const cleanSubPath = subPath.startsWith('/') ? subPath.slice(1) : subPath;

  const requestedPath = path.resolve(INTERFACE_PATH, cleanSubPath);
  const basePath = path.resolve(INTERFACE_PATH);

  if (!requestedPath.startsWith(basePath)) {
    sendJsonError(res, 403, 'Forbidden');

    return res;
  }

  if (!fs.existsSync(requestedPath)) {
    sendJsonError(res, 404, 'Not found');

    return res;
  }

  const stats = fs.statSync(requestedPath);

  if (stats.isDirectory()) {
    sendJsonError(res, 404, 'Not found');

    return res;
  }

  const isHashedAsset = /[-.][\da-f]{8,}\.\w+$/i.test(cleanSubPath);

  const cacheControl = isHashedAsset
    ? 'public, max-age=31536000, immutable'
    : 'no-cache';

  const etag = buildEtag(null, stats);
  const lastModified = stats.mtime.toUTCString();

  if (
    sendNotModified(req, res, {
      etag,
      lastModified,
      cacheControl,
      mtimeMs: stats.mtimeMs
    })
  ) {
    return res;
  }

  const file = Bun.file(requestedPath);
  const fileStream = fs.createReadStream(requestedPath);

  fileStream.on('open', () => {
    res.writeHead(200, {
      'Content-Type': file.type,
      'Content-Length': file.size,
      ETag: etag,
      'Last-Modified': lastModified,
      'Cache-Control': cacheControl
    });
    fileStream.pipe(res);
  });

  fileStream.on('error', (err) => {
    logger.error('Error serving file: %s', getErrorMessage(err));

    if (!res.headersSent) {
      sendJsonError(res, 500, 'Internal server error');
    } else {
      res.destroy();
    }
  });

  res.on('close', () => {
    fileStream.destroy();
  });

  return res;
};

export { interfaceRouteHandler };
