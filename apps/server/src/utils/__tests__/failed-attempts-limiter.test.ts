import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { config } from '../../config';
import { FailedAttemptsLimiter } from '../rate-limiters/failed-attempts-limiter';

describe('FailedAttemptsLimiter', () => {
  let now = 1000;
  let originalDateNow: typeof Date.now;

  const createLimiter = (maxEntries?: number) =>
    new FailedAttemptsLimiter({
      maxFailures: 3,
      windowMs: 2_000,
      blockMs: 1_000,
      maxBlockMs: 4_000,
      maxEntries
    });

  const failTimes = (
    limiter: FailedAttemptsLimiter,
    key: string,
    n: number
  ) => {
    let blockMs = 0;

    for (let i = 0; i < n; i++) {
      blockMs = limiter.recordFailure(key);
    }

    return blockMs;
  };

  beforeEach(() => {
    now = 1000;
    originalDateNow = Date.now;
    Date.now = () => now;
  });

  afterEach(() => {
    Date.now = originalDateNow;
  });

  test('blocks a key once it reaches maxFailures', () => {
    const limiter = createLimiter();

    expect(failTimes(limiter, '1.2.3.4', 2)).toBe(0);
    expect(limiter.getRetryAfterMs('1.2.3.4')).toBe(0);

    expect(limiter.recordFailure('1.2.3.4')).toBe(1_000);
    expect(limiter.getRetryAfterMs('1.2.3.4')).toBe(1_000);

    now += 400;

    expect(limiter.getRetryAfterMs('1.2.3.4')).toBe(600);

    now += 600;

    expect(limiter.getRetryAfterMs('1.2.3.4')).toBe(0);
  });

  test('does not count failures from an expired window', () => {
    const limiter = createLimiter();

    failTimes(limiter, '1.2.3.4', 2);

    now += 2_000;

    expect(failTimes(limiter, '1.2.3.4', 2)).toBe(0);
    expect(limiter.getRetryAfterMs('1.2.3.4')).toBe(0);
  });

  test('doubles the block for a returning key up to maxBlockMs, even past its window', () => {
    const limiter = createLimiter();
    const blocks: number[] = [];

    for (let i = 0; i < 4; i++) {
      const blockMs = failTimes(limiter, '1.2.3.4', 3);

      blocks.push(blockMs);
      now += blockMs;
    }

    expect(blocks).toEqual([1_000, 2_000, 4_000, 4_000]);
  });

  test('forgets the strikes once a full max block has passed after the block', () => {
    const limiter = createLimiter();

    now += failTimes(limiter, '1.2.3.4', 3);
    now += 4_000;

    expect(failTimes(limiter, '1.2.3.4', 3)).toBe(1_000);
  });

  test('tracks keys independently', () => {
    const limiter = createLimiter();

    failTimes(limiter, 'ip-a', 3);

    expect(limiter.getRetryAfterMs('ip-a')).toBe(1_000);
    expect(limiter.getRetryAfterMs('ip-b')).toBe(0);
  });

  test('does nothing while rate limiting is disabled in tests', () => {
    const limiter = createLimiter();

    globalThis.disableRateLimiting = true;

    expect(failTimes(limiter, '1.2.3.4', 3)).toBe(0);
    expect(limiter.getRetryAfterMs('1.2.3.4')).toBe(0);
  });

  test('never blocks an ip when rate limiters are disabled in the config', () => {
    const limiter = createLimiter();

    config.rateLimiters.enabled = false;

    try {
      expect(failTimes(limiter, '1.2.3.4', 3)).toBe(0);
      expect(limiter.getRetryAfterMs('1.2.3.4')).toBe(0);
    } finally {
      config.rateLimiters.enabled = true;
    }
  });

  test('never grows past maxEntries', () => {
    const limiter = createLimiter(10);

    for (let i = 0; i < 500; i++) {
      limiter.recordFailure(`key-${i}`);
    }

    expect(limiter.size).toBeLessThanOrEqual(10);
  });

  test('keeps an existing failure count when the table is full', () => {
    const limiter = createLimiter(2);

    failTimes(limiter, 'ip-a', 2);
    limiter.recordFailure('ip-b');

    expect(limiter.recordFailure('ip-a')).toBe(1_000);
    expect(limiter.getRetryAfterMs('ip-a')).toBe(1_000);
    expect(limiter.size).toBe(2);
  });

  test('evicts an unblocked key instead of the oldest active block', () => {
    const limiter = createLimiter(2);

    failTimes(limiter, 'ip-a', 3);
    limiter.recordFailure('ip-b');

    expect(failTimes(limiter, 'ip-c', 3)).toBe(1_000);
    expect(limiter.getRetryAfterMs('ip-a')).toBe(1_000);
    expect(limiter.getRetryAfterMs('ip-c')).toBe(1_000);
    expect(limiter.size).toBe(2);
  });

  test('reclaims expired entries before evicting a live failure count', () => {
    const limiter = createLimiter(2);

    failTimes(limiter, 'ip-a', 3);
    limiter.recordFailure('ip-b');
    now += 2_000;
    limiter.recordFailure('ip-a');

    limiter.recordFailure('ip-c');

    expect(failTimes(limiter, 'ip-a', 2)).toBe(2_000);
    expect(limiter.size).toBe(2);
  });

  test('preserves blocks and skips new keys when every entry is blocked', () => {
    const limiter = createLimiter(2);

    failTimes(limiter, 'ip-a', 3);
    failTimes(limiter, 'ip-b', 3);

    expect(failTimes(limiter, 'ip-c', 3)).toBe(0);
    expect(limiter.getRetryAfterMs('ip-a')).toBe(1_000);
    expect(limiter.getRetryAfterMs('ip-b')).toBe(1_000);
    expect(limiter.getRetryAfterMs('ip-c')).toBe(0);
    expect(limiter.size).toBe(2);

    now += 1_000;

    expect(failTimes(limiter, 'ip-c', 3)).toBe(1_000);
    expect(limiter.getRetryAfterMs('ip-c')).toBe(1_000);
    expect(limiter.size).toBe(2);
  });

  test('resets an expired existing entry without evicting another key', () => {
    const limiter = createLimiter(2);

    limiter.recordFailure('ip-a');
    now += 1_000;
    limiter.recordFailure('ip-b');
    now += 1_000;

    expect(limiter.recordFailure('ip-a')).toBe(0);
    expect(failTimes(limiter, 'ip-b', 2)).toBe(1_000);
    expect(failTimes(limiter, 'ip-a', 2)).toBe(1_000);
    expect(limiter.size).toBe(2);
  });
});
