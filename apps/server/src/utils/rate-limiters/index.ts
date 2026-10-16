import { IS_DEVELOPMENT, IS_TEST } from '../env';

type TFixedWindowRateLimiterOptions = {
  maxRequests: number;
  windowMs: number;
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

// this is a pretty basic implementation of a fixed window rate limiter, but for now it's better than nothing
class FixedWindowRateLimiter {
  private readonly entries = new Map<string, TRateLimitEntry>();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly maxEntries: number;

  constructor({
    maxRequests,
    windowMs,
    maxEntries = 10_000 // default to 10k entries
  }: TFixedWindowRateLimiterOptions) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.maxEntries = maxEntries;
  }

  public consume = (key: string): TRateLimitResult => {
    // the globalThis escape hatch is honoured only under test, so it cannot become a
    // production kill switch. limiting stays off in development, which does mean no dev
    // exercises this path
    if (
      (IS_DEVELOPMENT && !IS_TEST) ||
      (IS_TEST && globalThis.disableRateLimiting)
    ) {
      return {
        allowed: true,
        remaining: this.maxRequests,
        retryAfterMs: 0
      };
    }

    const now = Date.now();

    this.gc(now);

    const existing = this.entries.get(key);

    if (!existing || existing.resetAt <= now) {
      this.entries.set(key, {
        count: 1,
        resetAt: now + this.windowMs
      });

      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        retryAfterMs: 0
      };
    }

    if (existing.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: existing.resetAt - now
      };
    }

    existing.count += 1;

    return {
      allowed: true,
      remaining: this.maxRequests - existing.count,
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

export { FixedWindowRateLimiter };
export type { TRateLimitResult };
