import { FixedWindowRateLimiter } from '.';
import { FailedAttemptsLimiter } from './failed-attempts-limiter';

const trackedRateLimiters = new Set<{ clear: () => void }>();

const createRateLimiter = (
  options: ConstructorParameters<typeof FixedWindowRateLimiter>[0]
) => {
  const limiter = new FixedWindowRateLimiter(options);

  trackedRateLimiters.add(limiter);

  return limiter;
};

const createFailedAttemptsLimiter = (
  options: ConstructorParameters<typeof FailedAttemptsLimiter>[0]
) => {
  const limiter = new FailedAttemptsLimiter(options);

  trackedRateLimiters.add(limiter);

  return limiter;
};

const getRateLimitRetrySeconds = (retryAfterMs: number): number => {
  return Math.max(1, Math.ceil(retryAfterMs / 1000));
};

const getClientRateLimitKey = (input?: string): string => {
  return input && input.trim().length > 0 ? input.trim() : 'unknown';
};

const clearRateLimitersForTests = () => {
  for (const limiter of trackedRateLimiters) {
    limiter.clear();
  }
};

export {
  clearRateLimitersForTests,
  createFailedAttemptsLimiter,
  createRateLimiter,
  FixedWindowRateLimiter,
  getClientRateLimitKey,
  getRateLimitRetrySeconds
};
