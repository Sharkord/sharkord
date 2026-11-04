import z from 'zod';

export enum RateLimiter {
  LOGIN = 'login',
  JOIN_SERVER = 'joinServer',
  USE_SECRET_TOKEN = 'useSecretToken',
  PASSWORD = 'password',
  SEND_MESSAGE = 'sendMessage',
  SEARCH = 'search',
  SIGNAL_TYPING = 'signalTyping',
  JOIN_VOICE_CHANNEL = 'joinVoiceChannel',
  VOICE_REACTION = 'voiceReaction',
  VOICE_STATE = 'voiceState',
  VOICE_STREAM = 'voiceStream'
}

export const RATE_LIMIT_MIN_GLOBAL_REQUESTS = 20;
export const RATE_LIMIT_MAX_REQUESTS = 100_000;
export const RATE_LIMIT_MIN_WINDOW_MS = 1_000;
export const RATE_LIMIT_MAX_WINDOW_MS = 24 * 60 * 60_000;

const zWindowMs = z
  .number()
  .int()
  .min(RATE_LIMIT_MIN_WINDOW_MS)
  .max(RATE_LIMIT_MAX_WINDOW_MS);

const zRateLimit = z.object({
  maxRequests: z.number().int().min(1).max(RATE_LIMIT_MAX_REQUESTS),
  windowMs: zWindowMs
});

export const zRateLimiters = z.object({
  enabled: z.boolean(),
  global: zRateLimit.extend({
    maxRequests: z
      .number()
      .int()
      .min(RATE_LIMIT_MIN_GLOBAL_REQUESTS)
      .max(RATE_LIMIT_MAX_REQUESTS)
  }),
  overrides: z.object({
    [RateLimiter.LOGIN]: zRateLimit,
    [RateLimiter.JOIN_SERVER]: zRateLimit,
    [RateLimiter.USE_SECRET_TOKEN]: zRateLimit,
    [RateLimiter.PASSWORD]: zRateLimit,
    [RateLimiter.SEND_MESSAGE]: zRateLimit,
    [RateLimiter.SEARCH]: zRateLimit,
    [RateLimiter.SIGNAL_TYPING]: zRateLimit,
    [RateLimiter.JOIN_VOICE_CHANNEL]: zRateLimit,
    [RateLimiter.VOICE_REACTION]: zRateLimit,
    [RateLimiter.VOICE_STATE]: zRateLimit,
    [RateLimiter.VOICE_STREAM]: zRateLimit
  }),
  loginLockout: z.object({
    maxFailures: z.number().int().min(1).max(RATE_LIMIT_MAX_REQUESTS),
    windowMs: zWindowMs,
    blockMs: zWindowMs,
    maxBlockMs: zWindowMs
  })
});

export type TRateLimit = z.infer<typeof zRateLimit>;
export type TRateLimiters = z.infer<typeof zRateLimiters>;

export const DEFAULT_RATE_LIMITERS: TRateLimiters = {
  enabled: true,
  global: { maxRequests: 120, windowMs: 60_000 },
  overrides: {
    [RateLimiter.LOGIN]: { maxRequests: 5, windowMs: 60_000 },
    [RateLimiter.JOIN_SERVER]: { maxRequests: 5, windowMs: 60_000 },
    [RateLimiter.USE_SECRET_TOKEN]: { maxRequests: 2, windowMs: 120_000 },
    [RateLimiter.PASSWORD]: { maxRequests: 5, windowMs: 60_000 },
    [RateLimiter.SEND_MESSAGE]: { maxRequests: 15, windowMs: 60_000 },
    [RateLimiter.SEARCH]: { maxRequests: 15, windowMs: 60_000 },
    [RateLimiter.SIGNAL_TYPING]: { maxRequests: 40, windowMs: 5_000 },
    [RateLimiter.JOIN_VOICE_CHANNEL]: { maxRequests: 20, windowMs: 60_000 },
    [RateLimiter.VOICE_REACTION]: { maxRequests: 20, windowMs: 30_000 },
    [RateLimiter.VOICE_STATE]: { maxRequests: 300, windowMs: 60_000 },
    [RateLimiter.VOICE_STREAM]: { maxRequests: 200, windowMs: 60_000 }
  },
  loginLockout: {
    maxFailures: 20,
    windowMs: 15 * 60_000,
    blockMs: 15 * 60_000,
    maxBlockMs: 24 * 60 * 60_000
  }
};
