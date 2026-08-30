import type { TPluginHttpMethod } from '@sharkord/plugin-sdk';
import { getErrorMessage } from '@sharkord/shared';
import fs from 'fs';
import fsPromises from 'fs/promises';
import http from 'http';
import path from 'path';
import { config } from '../config';
import { isTrustedProxyAddress } from '../helpers/get-ws-info';
import { logger } from '../logger';
import type { FixedWindowRateLimiter } from '../utils/rate-limiters';
import {
  getClientRateLimitKey,
  getRateLimitRetrySeconds
} from '../utils/rate-limiters/rate-limiter';
import { PayloadTooLargeError } from './errors';

type HttpRouteHandler<TContext = undefined> = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  ctx: TContext
) => Promise<unknown> | unknown;

const supportedHttpMethods = [
  'GET',
  'POST',
  'PATCH',
  'DELETE',
  'OPTIONS'
] as const satisfies readonly TPluginHttpMethod[];

type TSupportedHttpMethod = (typeof supportedHttpMethods)[number];

const isSupportedHttpMethod = (
  method: string
): method is TSupportedHttpMethod => {
  return supportedHttpMethods.includes(method as TSupportedHttpMethod);
};

const getTextBody = async (
  req: http.IncomingMessage,
  maxBytes: number = config.server.maxRequestBodyBytes
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    req.on('data', (data: Buffer | string) => {
      // a stream with an encoding set emits strings, normalize before counting
      const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data);

      size += chunk.length;

      if (size > maxBytes) {
        // pause the stream to avoid reading more data than necessary, and reject the promise
        req.pause();
        reject(new PayloadTooLargeError(maxBytes));

        return;
      }

      chunks.push(chunk);
    });

    req.on('end', () => {
      // concat before decoding, a multi-byte character can straddle two chunks
      resolve(Buffer.concat(chunks).toString('utf-8'));
    });

    req.on('error', reject);
  });
};

const getJsonBody = async <T = any>(
  req: http.IncomingMessage,
  maxBytes: number = config.server.maxRequestBodyBytes
): Promise<T> => {
  const body = await getTextBody(req, maxBytes);

  return body ? JSON.parse(body) : ({} as T);
};

// consumes one slot for the caller and writes a 429 when the bucket is empty.
// returns false when the request has already been answered and the caller must
// stop. an unknown ip cannot be limited, so it is allowed through with a warning
const enforceHttpRateLimit = (
  res: http.ServerResponse,
  limiter: FixedWindowRateLimiter,
  ip: string | undefined,
  options: { route: string; message: string }
): boolean => {
  if (!ip) {
    logger.warn(
      `[Rate Limiter HTTP] Missing IP address in request info, skipping rate limiting for ${options.route} route.`
    );

    return true;
  }

  const key = getClientRateLimitKey(ip);
  const rateLimit = limiter.consume(key);

  if (rateLimit.allowed) return true;

  logger.debug(
    `[Rate Limiter HTTP] ${options.route} rate limited for key "${key}"`
  );

  res.setHeader(
    'Retry-After',
    getRateLimitRetrySeconds(rateLimit.retryAfterMs)
  );
  sendJsonError(res, 429, options.message);

  return false;
};

const applyCorsHeaders = (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const { allowedOrigins } = config.server;
  const requestOrigin = req.headers.origin;

  if (allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader(
    'Access-Control-Allow-Methods',
    supportedHttpMethods.join(', ')
  );
  res.setHeader('Access-Control-Allow-Headers', '*');
};

const hasPrefixPathSegment = (pathname: string, prefix: string): boolean => {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
};

const getForwardedHeader = (
  req: http.IncomingMessage,
  name: string
): string | undefined => {
  const value = req.headers[name];
  const first = Array.isArray(value) ? value[0] : value;

  return first?.split(',')[0]?.trim();
};

const getForwardedOrigin = (req: http.IncomingMessage) => {
  if (
    !isTrustedProxyAddress(
      req.socket.remoteAddress,
      config.server.trustedProxies
    )
  ) {
    return undefined;
  }

  return {
    proto: getForwardedHeader(req, 'x-forwarded-proto'),
    host: getForwardedHeader(req, 'x-forwarded-host')
  };
};

const isSecureRequest = (req: http.IncomingMessage): boolean => {
  const forwarded = getForwardedOrigin(req);

  if (forwarded?.proto) return forwarded.proto === 'https';

  return 'encrypted' in req.socket && !!req.socket.encrypted;
};

const getPublicOrigin = (req: http.IncomingMessage): string => {
  const forwarded = getForwardedOrigin(req);
  const proto = isSecureRequest(req) ? 'https' : 'http';

  return `${proto}://${forwarded?.host || req.headers.host}`;
};

const getRequestUrl = (req: http.IncomingMessage): URL | null => {
  if (!req.url) return null;

  try {
    return new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  } catch {
    return null;
  }
};

const sanitizeFileName = (name: string): string | null => {
  // the client percent-encodes the name because an http header cannot carry anything
  // outside latin-1. older clients send it raw, where decoding is a no-op. decoding has to
  // happen before the path checks below, or an encoded '%2e%2e%2f' would walk straight past them
  let decoded = name;

  try {
    decoded = decodeURIComponent(name);
  } catch {
    // a stray '%' is not a valid escape sequence, keep the name as it arrived
  }

  // reject null bytes which can truncate paths on some
  if (decoded.includes('\0')) {
    return null;
  }

  const normalized = decoded.replace(/\\/g, '/');

  // strip any directory components (e.g. "../../etc/passwd" -> "passwd")
  const baseName = path.basename(normalized);

  // reject empty names (e.g. after stripping path components from "/")
  if (!baseName || baseName === '.' || baseName === '..') {
    return null;
  }

  return baseName;
};

const buildEtag = (md5: string | null, stat: fs.Stats) => {
  if (md5) {
    return `"${md5}"`;
  }

  return `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
};

const hasMatchingEtag = (
  ifNoneMatchHeader: string | undefined,
  etag: string
) => {
  if (!ifNoneMatchHeader) {
    return false;
  }

  const candidates = ifNoneMatchHeader.split(',').map((part) => part.trim());

  return candidates.includes('*') || candidates.includes(etag);
};

const isNotModifiedByDate = (
  ifModifiedSinceHeader: string | undefined,
  mtimeMs: number
) => {
  if (!ifModifiedSinceHeader) {
    return false;
  }

  const ifModifiedSinceTime = Date.parse(ifModifiedSinceHeader);

  if (Number.isNaN(ifModifiedSinceTime)) {
    return false;
  }

  // HTTP dates are second precision, so truncate mtime for accurate comparisons.
  return Math.floor(mtimeMs / 1000) * 1000 <= ifModifiedSinceTime;
};

const parseByteRange = (
  rangeHeader: string,
  size: number
): { start: number; end: number } | null => {
  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);

  if (!match) return null;

  const [, rawStart, rawEnd] = match;

  if (size === 0) return null;

  if (!rawStart) {
    if (!rawEnd) return null;

    const suffixLength = parseInt(rawEnd, 10);

    if (suffixLength === 0) return null;

    return { start: Math.max(0, size - suffixLength), end: size - 1 };
  }

  const start = parseInt(rawStart, 10);

  if (start >= size) return null;

  const end = rawEnd ? Math.min(parseInt(rawEnd, 10), size - 1) : size - 1;

  if (end < start) return null;

  return { start, end };
};

const sendJsonError = (
  res: http.ServerResponse,
  statusCode: number,
  error: string
) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify({ error }));
};

const sendJsonFieldErrors = (
  res: http.ServerResponse,
  statusCode: number,
  errors: Record<string, string>
) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify({ errors }));
};

type CacheMetadata = {
  etag: string;
  lastModified: string;
  cacheControl: string;
  mtimeMs: number;
  extraHeaders?: Record<string, string>;
};

// implements RFC 7232 §6: when If-None-Match is present, If-Modified-Since is ignored.
const sendNotModified = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  meta: CacheMetadata
): boolean => {
  const ifNoneMatchHeader = req.headers['if-none-match'];
  const ifModifiedSinceHeader = req.headers['if-modified-since'];

  const isNotModified = ifNoneMatchHeader
    ? hasMatchingEtag(ifNoneMatchHeader, meta.etag)
    : isNotModifiedByDate(ifModifiedSinceHeader, meta.mtimeMs);

  if (!isNotModified) {
    return false;
  }

  res.writeHead(304, {
    ETag: meta.etag,
    'Last-Modified': meta.lastModified,
    'Cache-Control': meta.cacheControl,
    ...meta.extraHeaders
  });
  res.end();

  return true;
};

type TSendFileOptions = {
  cacheControl: string;
  md5?: string | null;
  contentType?: string;
  contentDisposition?: string;
  notFoundMessage?: string;
  onNotFound?: () => void;
};

const pipeFileStream = (
  filePath: string,
  res: http.ServerResponse,
  streamOptions?: { start: number; end: number }
) => {
  const fileStream = fs.createReadStream(filePath, streamOptions);

  fileStream.on('error', (err) => {
    logger.error('Error serving file: %s', getErrorMessage(err));

    // the status line is already out, dropping the socket is all that is left
    if (res.headersSent) {
      res.destroy();

      return;
    }

    sendJsonError(res, 500, 'Internal server error');
  });

  res.on('close', () => {
    fileStream.destroy();
  });

  fileStream.pipe(res);
};

// single entry point for every route that streams a file off disk: async stat,
// conditional requests, range requests and the stream error handling
const sendFile = async (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  filePath: string,
  options: TSendFileOptions
): Promise<void> => {
  let stats: fs.Stats;

  try {
    stats = await fsPromises.stat(filePath);
  } catch {
    options.onNotFound?.();
    sendJsonError(res, 404, options.notFoundMessage ?? 'Not found');

    return;
  }

  if (!stats.isFile()) {
    options.onNotFound?.();
    sendJsonError(res, 404, options.notFoundMessage ?? 'Not found');

    return;
  }

  const { cacheControl } = options;
  const etag = buildEtag(options.md5 ?? null, stats);
  const lastModified = stats.mtime.toUTCString();
  const contentType = options.contentType || Bun.file(filePath).type;
  const rangeHeader = req.headers.range;

  if (
    !rangeHeader &&
    sendNotModified(req, res, {
      etag,
      lastModified,
      cacheControl,
      mtimeMs: stats.mtimeMs,
      extraHeaders: { Vary: 'Range' }
    })
  ) {
    return;
  }

  const commonHeaders: Record<string, string | number> = {
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    ETag: etag,
    'Last-Modified': lastModified,
    'Cache-Control': cacheControl,
    Vary: 'Range',
    ...(options.contentDisposition
      ? { 'Content-Disposition': options.contentDisposition }
      : {})
  };

  if (!rangeHeader) {
    res.writeHead(200, {
      ...commonHeaders,
      'Content-Length': stats.size
    });

    pipeFileStream(filePath, res);

    return;
  }

  const range = parseByteRange(rangeHeader, stats.size);

  if (!range) {
    res.writeHead(416, {
      'Content-Range': `bytes */${stats.size}`,
      'Cache-Control': 'no-store'
    });
    res.end();

    return;
  }

  const { start, end } = range;

  res.writeHead(206, {
    ...commonHeaders,
    'Content-Length': end - start + 1,
    'Content-Range': `bytes ${start}-${end}/${stats.size}`
  });

  pipeFileStream(filePath, res, { start, end });
};

const buildCacheControl = (
  isSignedUrlProtected: boolean,
  tokenExpiresAt: number | null
) => {
  if (!isSignedUrlProtected) {
    return 'public, max-age=3600, must-revalidate';
  }

  const remainingSeconds = Math.max(
    0,
    Math.floor((tokenExpiresAt! - Date.now()) / 1000)
  );
  const maxAge = Math.min(300, remainingSeconds);

  return `private, max-age=${maxAge}, must-revalidate`;
};

export {
  applyCorsHeaders,
  buildCacheControl,
  buildEtag,
  enforceHttpRateLimit,
  getJsonBody,
  getPublicOrigin,
  getRequestUrl,
  getTextBody,
  hasPrefixPathSegment,
  isSecureRequest,
  isSupportedHttpMethod,
  parseByteRange,
  sanitizeFileName,
  sendFile,
  sendJsonError,
  sendJsonFieldErrors,
  sendNotModified,
  supportedHttpMethods
};
export type { HttpRouteHandler, TSupportedHttpMethod };
