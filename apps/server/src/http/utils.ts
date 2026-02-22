import type { FixedWindowRateLimiter } from "../utils/rate-limiters";
import http from 'http';
import { getClientRateLimitKey, getRateLimitRetrySeconds } from "../utils/rate-limiters/rate-limiter";
import { logger } from "../logger";


class HttpValidationError extends Error {
  field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = 'HttpValidationError';
    this.field = field;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function applyRateLimit(rateLimiter: FixedWindowRateLimiter, res: http.ServerResponse, path: string, ip?: string) {
  if (ip) {
    const key = getClientRateLimitKey(ip);
    const rateLimit = rateLimiter.consume(key);

    if (!rateLimit.allowed) {
      logger.debug(`[Rate Limiter HTTP] ${path} rate limited for key "${key}"`);

      res.setHeader(
        'Retry-After',
        getRateLimitRetrySeconds(rateLimit.retryAfterMs)
      );
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: `Too many ${path.replace(/^\//, '')} attempts. Please try again shortly.`
        })
      );

      return true;
    }
  } else {
    logger.warn(
      `[Rate Limiter HTTP] Missing IP address in request info, skipping rate limiting for ${path} route.`
    );
  }
  return false;
}

export { HttpValidationError, applyRateLimit };
