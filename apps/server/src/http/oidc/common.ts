import { OidcError } from '@sharkord/shared';
import type http from 'http';
import { config } from '../../config';
import { isOidcEnabled } from '../../helpers/oidc/settings';
import { logger } from '../../logger';
import {
  createRateLimiter,
  getClientRateLimitKey,
  getRateLimitRetrySeconds
} from '../../utils/rate-limiters/rate-limiter';
import { getPublicOrigin, isSecureRequest, sendJsonError } from '../helpers';

const OIDC_STATE_COOKIE_PREFIX = 'sharkord_oidc_state_';

const oidcRateLimiter = createRateLimiter({
  maxRequests: config.rateLimiters.oidc.maxRequests,
  windowMs: config.rateLimiters.oidc.windowMs
});

const redirectWithError = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  error: OidcError,
  extraHeaders: Record<string, string | string[]> = {}
) => {
  const target = new URL(getPublicOrigin(req));

  target.searchParams.set('oidc_error', error);

  res.writeHead(302, {
    'Cache-Control': 'no-store',
    ...extraHeaders,
    Location: target.toString()
  });
  res.end();
};

const consumeRateLimit = (ip: string | undefined, route: string) => {
  if (!ip) {
    logger.warn(
      `[Rate Limiter HTTP] Missing IP address in request info, skipping rate limiting for ${route} route.`
    );

    return { allowed: true, retryAfterMs: 0 };
  }

  return oidcRateLimiter.consume(getClientRateLimitKey(ip));
};

const guardOidcRoute = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  {
    ip,
    route,
    isNavigation
  }: { ip: string | undefined; route: string; isNavigation: boolean }
): boolean => {
  if (!isOidcEnabled()) {
    if (isNavigation) {
      redirectWithError(req, res, OidcError.SERVER_ERROR);
    } else {
      sendJsonError(res, 404, 'Not found');
    }

    return false;
  }

  const rateLimit = consumeRateLimit(ip, route);

  if (rateLimit.allowed) return true;

  logger.debug(`[Rate Limiter HTTP] ${route} rate limited`);

  if (isNavigation) {
    redirectWithError(req, res, OidcError.RATE_LIMITED);

    return false;
  }

  res.setHeader(
    'Retry-After',
    getRateLimitRetrySeconds(rateLimit.retryAfterMs)
  );
  sendJsonError(
    res,
    429,
    'Too many sign in attempts. Please try again shortly.'
  );

  return false;
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

const hasStateCookie = (req: http.IncomingMessage, state: string): boolean =>
  getCookie(req, `${OIDC_STATE_COOKIE_PREFIX}${state}`) === '1';

const buildStateCookie = (
  req: http.IncomingMessage,
  state: string,
  maxAgeSeconds: number
) => {
  const attributes = [
    `${OIDC_STATE_COOKIE_PREFIX}${state}=${maxAgeSeconds === 0 ? '' : '1'}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAgeSeconds}`
  ];

  if (isSecureRequest(req)) attributes.push('Secure');

  return attributes.join('; ');
};

const clearStateCookie = (req: http.IncomingMessage, state: string) =>
  buildStateCookie(req, state, 0);

export {
  buildStateCookie,
  clearStateCookie,
  getCookie,
  guardOidcRoute,
  hasStateCookie,
  OIDC_STATE_COOKIE_PREFIX,
  redirectWithError
};
