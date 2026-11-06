import type { TRateLimit } from '@sharkord/shared';
import { config } from '../../config';
import { getRateLimits } from '../../helpers/rate-limits';
import { IS_DEVELOPMENT, IS_TEST } from '../env';

type TFixedWindowRateLimiterOptions = {
  getLimit: () => TRateLimit;
  maxEntries?: number;
};

type TRateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

type TRateLimitEntry = {
  count: number;
  resetAt: number;
};

// share of the table dropped when it is full and nothing has expired
const EVICTION_RATIO = 0.1;

const isRateLimitingBypassed = () => {
  const { enabled } = getRateLimits();

  return (
    !config.server.rateLimitersEnabled ||
    !enabled ||
    (IS_DEVELOPMENT && !IS_TEST) ||
    (IS_TEST && !!globalThis.disableRateLimiting)
  );
};

// this is a pretty basic implementation of a fixed window rate limiter, but for now it's better than nothing
class FixedWindowRateLimiter {
  private readonly entries = new Map<string, TRateLimitEntry>();
  private readonly getLimit: () => TRateLimit;
  private readonly maxEntries: number;

  constructor({
    getLimit,
    maxEntries = 10_000 // default to 10k entries
  }: TFixedWindowRateLimiterOptions) {
    this.getLimit = getLimit;
    this.maxEntries = maxEntries;
  }

  public consume = (key: string): TRateLimitResult => {
    const { maxRequests, windowMs } = this.getLimit();

    if (isRateLimitingBypassed()) {
      return {
        allowed: true,
        remaining: maxRequests,
        retryAfterMs: 0
      };
    }

    const now = Date.now();

    this.gc(now);

    const existing = this.entries.get(key);

    if (!existing || existing.resetAt <= now) {
      this.entries.set(key, {
        count: 1,
        resetAt: now + windowMs
      });

      return {
        allowed: true,
        remaining: maxRequests - 1,
        retryAfterMs: 0
      };
    }

    if (existing.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: existing.resetAt - now
      };
    }

    existing.count += 1;

    return {
      allowed: true,
      remaining: maxRequests - existing.count,
      retryAfterMs: 0
    };
  };

  public clear = () => {
    this.entries.clear();
  };

  public get size() {
    return this.entries.size;
  }

  private gc = (now: number) => {
    if (this.entries.size < this.maxEntries) {
      return;
    }

    for (const [key, value] of this.entries) {
      if (value.resetAt <= now) {
        this.entries.delete(key);
      }
    }

    if (this.entries.size < this.maxEntries) {
      return;
    }

    const evictionCount = Math.max(
      1,
      Math.ceil(this.entries.size * EVICTION_RATIO)
    );

    const soonestToExpire = Array.from(this.entries.entries())
      .sort((a, b) => a[1].resetAt - b[1].resetAt)
      .slice(0, evictionCount);

    for (const [key] of soonestToExpire) {
      this.entries.delete(key);
    }
  };
}

export { FixedWindowRateLimiter, isRateLimitingBypassed };
export type { TRateLimitResult };
