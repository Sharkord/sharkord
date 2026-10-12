import { isRateLimitingBypassed } from '.';

type TFailedAttemptsLimiterOptions = {
  maxFailures: number;
  windowMs: number;
  blockMs: number;
  maxBlockMs: number;
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
  private readonly maxFailures: number;
  private readonly windowMs: number;
  private readonly blockMs: number;
  private readonly maxBlockMs: number;
  private readonly maxEntries: number;

  constructor({
    maxFailures,
    windowMs,
    blockMs,
    maxBlockMs,
    maxEntries = 10_000
  }: TFailedAttemptsLimiterOptions) {
    this.maxFailures = maxFailures;
    this.windowMs = windowMs;
    this.blockMs = blockMs;
    this.maxBlockMs = maxBlockMs;
    this.maxEntries = maxEntries;
  }

  public getRetryAfterMs = (key: string): number => {
    const entry = this.entries.get(key);

    if (!entry) return 0;

    return Math.max(0, entry.blockedUntil - Date.now());
  };

  public recordFailure = (key: string): number => {
    if (isRateLimitingBypassed()) return 0;

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
      entry.windowResetAt = now + this.windowMs;
    }

    entry.failures += 1;

    if (entry.failures < this.maxFailures) return 0;

    const blockMs = Math.min(
      this.blockMs * 2 ** entry.strikes,
      this.maxBlockMs
    );

    entry.failures = 0;
    entry.strikes += 1;
    entry.blockedUntil = now + blockMs;

    return blockMs;
  };

  public clear = () => {
    this.entries.clear();
  };

  public get size() {
    return this.entries.size;
  }

  private getForgetAt = (entry: TFailedAttemptsEntry) =>
    Math.max(
      entry.windowResetAt,
      entry.strikes > 0 ? entry.blockedUntil + this.maxBlockMs : 0
    );

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
