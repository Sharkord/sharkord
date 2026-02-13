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

    const oldestKey = this.entries.keys().next().value;

    if (oldestKey) {
      this.entries.delete(oldestKey);
    }
  };
}

export { FixedWindowRateLimiter };
export type { TRateLimitResult };
