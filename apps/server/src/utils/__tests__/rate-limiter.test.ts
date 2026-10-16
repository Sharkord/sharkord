import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { FixedWindowRateLimiter } from '../rate-limiters';

describe('FixedWindowRateLimiter', () => {
  let now = 1000;
  let originalDateNow: typeof Date.now;

  beforeEach(() => {
    now = 1000;
    originalDateNow = Date.now;
    Date.now = () => now;
  });

  afterEach(() => {
    Date.now = originalDateNow;
  });

  test('allows requests until max, then blocks', () => {
    const limiter = new FixedWindowRateLimiter({
      maxRequests: 3,
      windowMs: 10_000
    });

    expect(limiter.consume('127.0.0.1')).toEqual({
      allowed: true,
      remaining: 2,
      retryAfterMs: 0
    });

    expect(limiter.consume('127.0.0.1')).toEqual({
      allowed: true,
      remaining: 1,
      retryAfterMs: 0
    });

    expect(limiter.consume('127.0.0.1')).toEqual({
      allowed: true,
      remaining: 0,
      retryAfterMs: 0
    });

    const blocked = limiter.consume('127.0.0.1');

    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBe(10_000);
  });

  test('resets counter after the time window expires', () => {
    const limiter = new FixedWindowRateLimiter({
      maxRequests: 1,
      windowMs: 5_000
    });

    expect(limiter.consume('1.2.3.4').allowed).toBe(true);
    expect(limiter.consume('1.2.3.4').allowed).toBe(false);

    now += 5_000;

    const afterReset = limiter.consume('1.2.3.4');

    expect(afterReset).toEqual({
      allowed: true,
      remaining: 0,
      retryAfterMs: 0
    });
  });

  test('tracks limits independently per key', () => {
    const limiter = new FixedWindowRateLimiter({
      maxRequests: 1,
      windowMs: 60_000
    });

    expect(limiter.consume('ip-a').allowed).toBe(true);
    expect(limiter.consume('ip-a').allowed).toBe(false);
    expect(limiter.consume('ip-b').allowed).toBe(true);
  });

  test('clear removes all tracked keys', () => {
    const limiter = new FixedWindowRateLimiter({
      maxRequests: 1,
      windowMs: 60_000
    });

    limiter.consume('ip-a');
    expect(limiter.consume('ip-a').allowed).toBe(false);

    limiter.clear();

    expect(limiter.consume('ip-a')).toEqual({
      allowed: true,
      remaining: 0,
      retryAfterMs: 0
    });
  });

  test('evicts to stay within maxEntries', () => {
    const limiter = new FixedWindowRateLimiter({
      maxRequests: 2,
      windowMs: 60_000,
      maxEntries: 2
    });

    limiter.consume('a');
    limiter.consume('b');
    limiter.consume('c');

    const aAfterEviction = limiter.consume('a');

    expect(aAfterEviction).toEqual({
      allowed: true,
      remaining: 1,
      retryAfterMs: 0
    });
  });

  test('reclaims expired entries and leaves live ones alone', () => {
    const limiter = new FixedWindowRateLimiter({
      maxRequests: 1,
      windowMs: 50,
      maxEntries: 3
    });

    limiter.consume('stale-a');
    limiter.consume('stale-b');

    Bun.sleepSync(60);

    // inserted after the others expired, so this one is the only live entry
    limiter.consume('live');
    limiter.consume('newcomer');

    // the sweep freed the two expired keys, so the live window was untouched
    expect(limiter.consume('live').allowed).toBe(false);
  });

  test('evicts a batch when full instead of a single entry', () => {
    const limiter = new FixedWindowRateLimiter({
      maxRequests: 1,
      windowMs: 60_000,
      maxEntries: 20
    });

    for (let i = 0; i < 20; i++) {
      limiter.consume(`key-${i}`);
    }

    expect(limiter.size).toBe(20);

    // one insert over the cap evicts ceil(20 * 0.1) = 2, leaving headroom so
    // the next inserts do not each trigger another sweep
    limiter.consume('newcomer');

    expect(limiter.size).toBe(19);
  });

  test('never grows past maxEntries', () => {
    const limiter = new FixedWindowRateLimiter({
      maxRequests: 1,
      windowMs: 60_000,
      maxEntries: 10
    });

    for (let i = 0; i < 500; i++) {
      limiter.consume(`key-${i}`);
    }

    expect(limiter.size).toBeLessThanOrEqual(10);
  });
});
