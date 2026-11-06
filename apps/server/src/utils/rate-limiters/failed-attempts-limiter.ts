import type { TRateLimiters } from '@sharkord/shared';
import { isRateLimitingBypassed } from '.';

type TFailedAttemptsLimit = TRateLimiters['loginLockout'];

type TFailedAttemptsLimiterOptions = {
  getLimit: () => TFailedAttemptsLimit;
  maxEntries?: number;
};

type TFailedAttemptsEntry = {
  failures: number;
  windowResetAt: number;
  blockedUntil: number;
  strikes: number;
};

class FailedAttemptsLimiter {
  private readonly entries = new Map<string, TFailedAttemptsEntry>();
  private readonly getLimit: () => TFailedAttemptsLimit;
  private readonly maxEntries: number;

  constructor({
    getLimit,
    maxEntries = 10_000
  }: TFailedAttemptsLimiterOptions) {
    this.getLimit = getLimit;
    this.maxEntries = maxEntries;
  }

  public getRetryAfterMs = (key: string): number => {
    const entry = this.entries.get(key);

    if (!entry) return 0;

    return Math.max(0, entry.blockedUntil - Date.now());
  };

  public recordFailure = (key: string): number => {
    if (isRateLimitingBypassed()) return 0;

    const { maxFailures, windowMs, blockMs, maxBlockMs } = this.getLimit();
    const now = Date.now();

    let entry = this.entries.get(key);

    if (!entry) {
      this.gc(now);

      // preserve active blocks when no slot is available for a new key
      if (this.entries.size >= this.maxEntries) return 0;
    }

    if (!entry || this.getForgetAt(entry) <= now) {
      entry = { failures: 0, windowResetAt: 0, blockedUntil: 0, strikes: 0 };

      this.entries.set(key, entry);
    }

    if (entry.windowResetAt <= now) {
      entry.failures = 0;
      entry.windowResetAt = now + windowMs;
    }

    entry.failures += 1;

    if (entry.failures < maxFailures) return 0;

    const currentBlockMs = Math.min(blockMs * 2 ** entry.strikes, maxBlockMs);

    entry.failures = 0;
    entry.strikes += 1;
    entry.blockedUntil = now + currentBlockMs;

    return currentBlockMs;
  };

  public clear = () => {
    this.entries.clear();
  };

  public get size() {
    return this.entries.size;
  }

  private getForgetAt = (entry: TFailedAttemptsEntry) => {
    const { maxBlockMs } = this.getLimit();

    return Math.max(
      entry.windowResetAt,
      entry.strikes > 0 ? entry.blockedUntil + maxBlockMs : 0
    );
  };

  private gc = (now: number) => {
    if (this.entries.size < this.maxEntries) return;

    for (const [key, entry] of this.entries) {
      if (this.getForgetAt(entry) <= now) {
        this.entries.delete(key);
      }
    }

    if (this.entries.size < this.maxEntries) return;

    for (const [key, entry] of this.entries) {
      if (entry.blockedUntil <= now) {
        this.entries.delete(key);

        return;
      }
    }
  };
}

export { FailedAttemptsLimiter };
