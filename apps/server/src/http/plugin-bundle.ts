import { getErrorMessage } from '@sharkord/shared';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { getSettings } from '../db/queries/server';
import { PLUGINS_PATH } from '../helpers/paths';
import { logger } from '../logger';
import { buildEtag, sendJsonError, sendNotModified } from './helpers';

const pluginBundleRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const { enablePlugins } = await getSettings();

  if (!enablePlugins) {
    sendJsonError(res, 403, 'Plugins are disabled on this server');

    return;
  }

  if (!req.url) {
    sendJsonError(res, 400, 'Bad request');

    return;
  }

  let url: URL;

  try {
    url = new URL(req.url, `http://${req.headers.host}`);
  } catch {
    sendJsonError(res, 400, 'Bad request');
    return;
  }

  let decodedPathname: string;

  try {
    decodedPathname = decodeURIComponent(url.pathname);
  } catch {
    sendJsonError(res, 400, 'Invalid URL encoding');

    return;
  }

  const [, route, pluginId, ...filePathParts] = decodedPathname.split('/');

  if (route !== 'plugin-bundle') {
    sendJsonError(res, 404, 'Not found');

    return;
  }

  if (!pluginId || filePathParts.length === 0) {
    sendJsonError(res, 400, 'Plugin ID and file path are required in the URL');

    return;
  }

  const requestedSubPath = filePathParts.join('/');
  const pluginPath = path.resolve(PLUGINS_PATH, pluginId);
  const requestedPath = path.resolve(pluginPath, requestedSubPath);

  if (!pluginPath.startsWith(path.resolve(PLUGINS_PATH))) {
    sendJsonError(res, 403, 'Forbidden');

    return;
  }

  if (!requestedPath.startsWith(pluginPath)) {
    sendJsonError(res, 403, 'Forbidden');

    return;
  }

  const fileName = path.basename(requestedPath);

  if (!fs.existsSync(requestedPath)) {
    sendJsonError(res, 404, 'File not found on disk');

    return;
  }

  const stats = fs.statSync(requestedPath);

  if (stats.isDirectory()) {
    sendJsonError(res, 404, 'File not found on disk');

    return;
  }

  const etag = buildEtag(null, stats);
  const lastModified = stats.mtime.toUTCString();
  const cacheControl = 'no-cache';

  if (
    sendNotModified(req, res, {
      etag,
      lastModified,
      cacheControl,
      mtimeMs: stats.mtimeMs
    })
  ) {
    return;
  }

  const file = Bun.file(requestedPath);
  const fileStream = fs.createReadStream(requestedPath);

  res.writeHead(200, {
    'Content-Type': file.type || 'application/octet-stream',
    'Content-Length': file.size,
    'Content-Disposition': `attachment; filename="${fileName}"`,
    ETag: etag,
    'Last-Modified': lastModified,
    'Cache-Control': cacheControl
  });

  fileStream.pipe(res);

  fileStream.on('error', (err) => {
    logger.error('Error serving file: %s', getErrorMessage(err));

    if (!res.headersSent) {
      sendJsonError(res, 500, 'Internal server error');
    }
  });

  res.on('close', () => {
    fileStream.destroy();
  });

  fileStream.on('end', () => {
    res.end();
  });

  return res;
};

export { pluginBundleRouteHandler };
