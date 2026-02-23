import { DELETED_USER_IDENTITY_AND_NAME, sha256 } from '@sharkord/shared';
import chalk from 'chalk';
import { eq } from 'drizzle-orm';
import http from 'http';
import jwt from 'jsonwebtoken';
import z from 'zod';
import { config } from '../config';
import { db } from '../db';
import { getServerToken, getSettings } from '../db/queries/server';
import { getUserByIdentity } from '../db/queries/users';
import { users } from '../db/schema';
import { getWsInfo } from '../helpers/get-ws-info';
import { safeCompare } from '../helpers/safe-compare';
import { logger } from '../logger';
import { createRateLimiter } from '../utils/rate-limiters/rate-limiter';
import { getJsonBody } from './helpers';
import { applyRateLimit, HttpValidationError } from './utils';

const zBody = z.object({
  identity: z.string().trim().min(1, 'Identity is required'),
  password: z.string().min(4, 'Password is required').max(128),
  invite: z.string().optional()
});

const loginRateLimiter = createRateLimiter({
  maxRequests: config.rateLimiters.joinServer.maxRequests,
  windowMs: config.rateLimiters.joinServer.windowMs
});

const loginRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const data = zBody.parse(await getJsonBody(req));

  if (data.identity === DELETED_USER_IDENTITY_AND_NAME) {
    throw new HttpValidationError('identity', 'This identity is reserved');
  }

  const settings = await getSettings();
  let existingUser = await getUserByIdentity(data.identity);
  const connectionInfo = getWsInfo(undefined, req);

  const rateLimited = applyRateLimit(
    loginRateLimiter,
    res,
    '/login',
    connectionInfo?.ip
  );
  if (rateLimited) return;

  if (!existingUser)
    throw new HttpValidationError('password', 'Invalid password'); // Ensure output is same as wrong password to prevent user enumeration, timing based may be possible as no argon2 comparison is done

  if (existingUser.banned) {
    throw new HttpValidationError(
      'identity',
      `Identity banned: ${existingUser.banReason || 'No reason provided'}`
    );
  }

  // temporary logic to migrate old SHA256 password hashes to argon2 on login
  const isPasswordArgon = existingUser.password.startsWith('$argon2');

  let passwordMatches = false;

  if (isPasswordArgon) {
    passwordMatches = await Bun.password.verify(
      data.password,
      existingUser.password
    );
  } else {
    logger.info(
      `${chalk.dim('[Auth]')} User "${existingUser.identity}" is using legacy SHA256 password hash, upgrading to argon2...`
    );

    const hashInputPassword = await sha256(data.password);

    passwordMatches = safeCompare(hashInputPassword, existingUser.password);

    if (passwordMatches) {
      const argon2Password = await Bun.password.hash(data.password);

      await db
        .update(users)
        .set({
          password: argon2Password
        })
        .where(eq(users.id, existingUser.id));
    }
  }

  if (!passwordMatches) {
    logger.info(
      `${chalk.dim('[Auth]')} Failed login attempt for user "${existingUser.identity}" due to invalid password. (IP: ${connectionInfo?.ip || 'unknown'})`
    );

    throw new HttpValidationError('password', 'Invalid password');
  }

  const token = jwt.sign({ userId: existingUser.id }, await getServerToken(), {
    expiresIn: '86400s' // 1 day
  });

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true, token }));

  return res;
};

export { loginRouteHandler };
