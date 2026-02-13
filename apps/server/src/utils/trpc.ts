import {
  ChannelPermission,
  UserStatus,
  type Permission,
  type TUser
} from '@sharkord/shared';
import { initTRPC, TRPCError } from '@trpc/server';
import chalk from 'chalk';
import type WebSocket from 'ws';
import { config } from '../config';
import { logger } from '../logger';
import type { TConnectionInfo } from '../types';
import { invariant } from './invariant';
import { pubsub } from './pubsub';
import {
  createRateLimiter,
  getClientRateLimitKey
} from './rate-limiters/rate-limiter';

export type Context = {
  handshakeHash: string;
  authenticated: boolean;
  pubsub: typeof pubsub;
  user: TUser;
  userId: number;
  token: string;
  currentVoiceChannelId: number | undefined;
  hasPermission: (
    targetPermission: Permission | Permission[]
  ) => Promise<boolean>;
  needsPermission: (
    targetPermission: Permission | Permission[]
  ) => Promise<void>;
  hasChannelPermission: (
    channelId: number,
    targetPermission: ChannelPermission
  ) => Promise<boolean>;
  needsChannelPermission: (
    channelId: number,
    targetPermission: ChannelPermission
  ) => Promise<void>;
  getOwnWs: () => WebSocket | undefined;
  getStatusById: (userId: number) => UserStatus;
  setWsUserId: (userId: number) => void;
  getUserWs: (userId: number) => WebSocket | undefined;
  getConnectionInfo: () => TConnectionInfo | undefined;
  throwValidationError: (field: string, message: string) => never;
  saveUserIp: (userId: number, ip: string) => Promise<void>;
};

const t = initTRPC.context<Context>().create();

const timingMiddleware = t.middleware(async ({ path, next }) => {
  if (!config.server.debug) {
    return next();
  }

  const start = performance.now();
  const result = await next();
  const end = performance.now();
  const duration = end - start;

  logger.debug(
    `${chalk.dim('[tRPC]')} ${chalk.yellow(path)} took ${chalk.green(duration.toFixed(2))} ms`
  );

  return result;
});

const authMiddleware = t.middleware(async ({ ctx, next }) => {
  invariant(ctx.authenticated, {
    code: 'UNAUTHORIZED',
    message: 'You must be authenticated to perform this action.'
  });

  return next();
});

type TRateLimitedProcedureOptions = {
  maxRequests: number;
  windowMs: number;
  logLabel: string;
  maxEntries?: number;
};

const rateLimitedProcedure = (
  procedure: typeof t.procedure,
  options: TRateLimitedProcedureOptions
) => {
  const limiter = createRateLimiter({
    maxRequests: options.maxRequests,
    windowMs: options.windowMs,
    maxEntries: options.maxEntries
  });

  const rateLimitMiddleware = t.middleware(async ({ ctx, next }) => {
    const key = getClientRateLimitKey(ctx.getConnectionInfo()?.ip);
    const rateLimit = limiter.consume(key);

    if (!rateLimit.allowed) {
      logger.debug(
        `${chalk.dim('[Rate Limiter tRPC]')} ${options.logLabel} rate limited for key "${key}"`
      );

      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests. Please try again shortly.'
      });
    }

    return next();
  });

  return procedure.use(rateLimitMiddleware);
};

// this should be used for all queries and mutations apart from the join server one
// it prevents users that only are connected to the wss but did not join the server from accessing protected procedures
const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(authMiddleware);

const publicProcedure = t.procedure.use(timingMiddleware);

export { protectedProcedure, publicProcedure, rateLimitedProcedure, t };
