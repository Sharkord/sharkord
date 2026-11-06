import {
  DEFAULT_RATE_LIMITERS,
  getErrorMessage,
  RateLimiter,
  zRateLimiters,
  type TRateLimit,
  type TRateLimiters
} from '@sharkord/shared';
import { getSettings } from '../db/queries/server';
import { logger } from '../logger';
import { deepMerge } from '../utils/deep-merge';

// store rate limits in memory to avoid reading from the database on every request
let rateLimits: TRateLimiters = DEFAULT_RATE_LIMITERS;

const parseRateLimits = (stored: TRateLimiters | null): TRateLimiters => {
  if (!stored) return DEFAULT_RATE_LIMITERS;

  try {
    return zRateLimiters.parse(deepMerge(DEFAULT_RATE_LIMITERS, stored));
  } catch (error) {
    logger.error(
      `Stored rate limits are invalid, falling back to the defaults: ${getErrorMessage(error)}`
    );

    return DEFAULT_RATE_LIMITERS;
  }
};

const loadRateLimits = async () => {
  const { rateLimiters } = await getSettings();

  rateLimits = parseRateLimits(rateLimiters);
};

const getRateLimits = () => rateLimits;

const getRateLimit = (rateLimiter?: RateLimiter): TRateLimit => {
  if (!rateLimiter) return rateLimits.global;

  return rateLimits.overrides[rateLimiter];
};

const getLoginLockout = () => rateLimits.loginLockout;

const setRateLimits = (value: TRateLimiters) => {
  rateLimits = value;
};

export {
  getLoginLockout,
  getRateLimit,
  getRateLimits,
  loadRateLimits,
  parseRateLimits,
  setRateLimits
};
