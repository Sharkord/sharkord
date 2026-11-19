import http from 'http';
import path from 'path';
import { isPathInside } from '../helpers/is-path-inside';
import { INTERFACE_PATH } from '../helpers/paths';
import { IS_DEVELOPMENT, IS_TEST } from '../utils/env';
import {
  findPrecompressed,
  HASHED_ASSET_REGEX,
  sendFile,
  sendJsonError
} from './helpers';

// report-only: the browser logs violations and enforces nothing
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self' ws: wss: https://raw.githubusercontent.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'"
].join('; ');

const interfaceRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  { url }: { url: URL }
) => {
  if (IS_DEVELOPMENT && !IS_TEST) {
    res.writeHead(302, { Location: `http://localhost:5173${url.search}` });
    res.end();

    return res;
  }

  res.setHeader('Content-Security-Policy-Report-Only', CONTENT_SECURITY_POLICY);

  let subPath = decodeURIComponent(url.pathname);

  subPath = subPath === '/' ? 'index.html' : subPath;

  const cleanSubPath = subPath.startsWith('/') ? subPath.slice(1) : subPath;

  const requestedPath = path.resolve(INTERFACE_PATH, cleanSubPath);

  if (!isPathInside(INTERFACE_PATH, requestedPath)) {
    sendJsonError(res, 403, 'Forbidden');

    return res;
  }

  const cacheControl = HASHED_ASSET_REGEX.test(cleanSubPath)
    ? 'public, max-age=31536000, immutable'
    : 'no-cache';

  let varyAcceptEncoding = false;

  if (!req.headers.range) {
    const { hasVariant, match } = await findPrecompressed(req, requestedPath);

    if (match) {
      await sendFile(req, res, requestedPath + match.extension, {
        cacheControl,
        contentType: Bun.file(requestedPath).type,
        contentEncoding: match.encoding,
        varyAcceptEncoding: true
      });

      return res;
    }

    varyAcceptEncoding = hasVariant;
  }

  await sendFile(req, res, requestedPath, { cacheControl, varyAcceptEncoding });

  return res;
};

export { interfaceRouteHandler };
