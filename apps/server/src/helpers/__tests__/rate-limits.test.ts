import {
  DEFAULT_RATE_LIMITERS,
  RateLimiter,
  type TRateLimiters
} from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { updateSettings } from '../../db/mutations/server';
import { getRateLimits, loadRateLimits, parseRateLimits } from '../rate-limits';

describe('rate limits', () => {
  test('should use the defaults when nothing was saved', () => {
    expect(parseRateLimits(null)).toEqual(DEFAULT_RATE_LIMITERS);
  });

  test('should fill a limiter missing from the saved value with its default', () => {
    const { search: _search, ...overrides } = DEFAULT_RATE_LIMITERS.overrides;
    const stored = {
      ...DEFAULT_RATE_LIMITERS,
      global: { maxRequests: 200, windowMs: 60_000 },
      overrides
    } as TRateLimiters;

    const parsed = parseRateLimits(stored);

    expect(parsed.global).toEqual({ maxRequests: 200, windowMs: 60_000 });
    expect(parsed.overrides[RateLimiter.SEARCH]).toEqual(
      DEFAULT_RATE_LIMITERS.overrides[RateLimiter.SEARCH]
    );
  });

  test('should fall back to the defaults when the saved value is invalid', () => {
    const stored = {
      ...DEFAULT_RATE_LIMITERS,
      global: { maxRequests: -1, windowMs: 60_000 }
    };

    expect(parseRateLimits(stored)).toEqual(DEFAULT_RATE_LIMITERS);
  });

  test('should load the saved limits from the database', async () => {
    const stored: TRateLimiters = {
      ...DEFAULT_RATE_LIMITERS,
      global: { maxRequests: 500, windowMs: 30_000 }
    };

    await updateSettings({ rateLimiters: stored });
    await loadRateLimits();

    expect(getRateLimits()).toEqual(stored);
  });
});
