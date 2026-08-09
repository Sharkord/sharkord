import http from 'http';
import path from 'path';
import { INTERFACE_PATH, isPathInside } from '../helpers/paths';
import { IS_DEVELOPMENT, IS_TEST } from '../utils/env';
import { sendFile, sendJsonError } from './helpers';

const interfaceRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  { url }: { url: URL }
) => {
  if (IS_DEVELOPMENT && !IS_TEST) {
    res.writeHead(302, { Location: 'http://localhost:5173' });
    res.end();

    return res;
  }

  let subPath = decodeURIComponent(url.pathname);

  subPath = subPath === '/' ? 'index.html' : subPath;

  const cleanSubPath = subPath.startsWith('/') ? subPath.slice(1) : subPath;

  const requestedPath = path.resolve(INTERFACE_PATH, cleanSubPath);

  if (!isPathInside(INTERFACE_PATH, requestedPath)) {
    sendJsonError(res, 403, 'Forbidden');

    return res;
  }

  const isHashedAsset = /[-.][\da-f]{8,}\.\w+$/i.test(cleanSubPath);

  await sendFile(req, res, requestedPath, {
    cacheControl: isHashedAsset
      ? 'public, max-age=31536000, immutable'
      : 'no-cache'
  });

  return res;
};

export { interfaceRouteHandler };
