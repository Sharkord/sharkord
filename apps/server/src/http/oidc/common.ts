import { OidcError } from '@sharkord/shared';
import type http from 'http';
import { config } from '../../config';
import { isOidcEnabled } from '../../helpers/oidc/settings';
import { createRateLimiter } from '../../utils/rate-limiters/rate-limiter';
import {
  enforceHttpRateLimit,
  isSecureRequest,
  sendJsonError
} from '../helpers';

const OIDC_STATE_COOKIE = 'sharkord_oidc_state';

const oidcRateLimiter = createRateLimiter({
  maxRequests: config.rateLimiters.oidc.maxRequests,
  windowMs: config.rateLimiters.oidc.windowMs
});

const guardOidcRoute = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  ip: string | undefined,
  route: string
): boolean => {
  if (!isOidcEnabled()) {
    sendJsonError(res, 404, 'Not found');

    return false;
  }

  return enforceHttpRateLimit(res, oidcRateLimiter, ip, {
    route,
    message: 'Too many sign in attempts. Please try again shortly.'
  });
};

const getCookie = (
  req: http.IncomingMessage,
  name: string
): string | undefined => {
  const header = req.headers.cookie;

  if (!header) return undefined;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');

    if (separator === -1) continue;

    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }

  return undefined;
};

const buildStateCookie = (
  req: http.IncomingMessage,
  value: string,
  maxAgeSeconds: number
) => {
  const attributes = [
    `${OIDC_STATE_COOKIE}=${value}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAgeSeconds}`
  ];

  if (isSecureRequest(req)) attributes.push('Secure');

  return attributes.join('; ');
};

const clearStateCookie = (req: http.IncomingMessage) =>
  buildStateCookie(req, '', 0);

const redirectWithError = (
  res: http.ServerResponse,
  origin: string,
  error: OidcError,
  extraHeaders: Record<string, string | string[]> = {}
) => {
  const target = new URL(origin);

  target.searchParams.set('oidc_error', error);

  res.writeHead(302, {
    'Cache-Control': 'no-store',
    ...extraHeaders,
    Location: target.toString()
  });
  res.end();
};

export {
  buildStateCookie,
  clearStateCookie,
  getCookie,
  guardOidcRoute,
  OIDC_STATE_COOKIE,
  redirectWithError
};
