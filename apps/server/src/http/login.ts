import {
  ActivityLogType,
  DELETED_USER_IDENTITY_AND_NAME,
  sha256,
  type TJoinedUser
} from '@sharkord/shared';
import chalk from 'chalk';
import { eq, sql } from 'drizzle-orm';
import http from 'http';
import jwt from 'jsonwebtoken';
import z from 'zod';
import { config } from '../config';
import { db } from '../db';
import { publishUser } from '../db/publishers';
import { isInviteValid } from '../db/queries/invites';
import { getDefaultRole } from '../db/queries/roles';
import { getServerToken, getSettings } from '../db/queries/server';
import { getUserByIdentity } from '../db/queries/users';
import { invites, userRoles, users } from '../db/schema';
import { getWsInfo } from '../helpers/get-ws-info';
import { safeCompare } from '../helpers/safe-compare';
import { logger } from '../logger';
import { enqueueActivityLog } from '../queues/activity-log';
import { invariant } from '../utils/invariant';
import {
  createRateLimiter,
  getClientRateLimitKey,
  getRateLimitRetrySeconds
} from '../utils/rate-limiters/rate-limiter';
import { getJsonBody } from './helpers';
import { HttpValidationError } from './utils';

const zBody = z.object({
  identity: z.string().min(1, 'Identity is required'),
  password: z.string().min(4, 'Password is required').max(128),
  invite: z.string().optional()
});

const loginRateLimiter = createRateLimiter({
  maxRequests: config.rateLimiters.joinServer.maxRequests,
  windowMs: config.rateLimiters.joinServer.windowMs
});

const registerUser = async (
  identity: string,
  password: string,
  inviteCode?: string,
  ip?: string
): Promise<TJoinedUser> => {
  const hashedPassword = (await Bun.password.hash(password)).toString();

  const defaultRole = await getDefaultRole();

  invariant(defaultRole, {
    code: 'NOT_FOUND',
    message: 'Default role not found'
  });

  const user = await db
    .insert(users)
    .values({
      name: 'SharkordUser',
      identity,
      createdAt: Date.now(),
      password: hashedPassword
    })
    .returning()
    .get();

  await db.insert(userRoles).values({
    roleId: defaultRole.id,
    userId: user.id,
    createdAt: Date.now()
  });

  publishUser(user.id, 'create');

  const registeredUser = await getUserByIdentity(identity);

  if (!registeredUser) {
    throw new Error('User registration failed');
  }

  if (inviteCode) {
    enqueueActivityLog({
      type: ActivityLogType.USED_INVITE,
      userId: registeredUser.id,
      details: { code: inviteCode },
      ip
    });
  }

  return registeredUser;
};

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

  if (connectionInfo?.ip) {
    const key = getClientRateLimitKey(connectionInfo.ip);
    const rateLimit = loginRateLimiter.consume(key);

    if (!rateLimit.allowed) {
      logger.debug(`[Rate Limiter HTTP] /login rate limited for key "${key}"`);

      res.setHeader(
        'Retry-After',
        getRateLimitRetrySeconds(rateLimit.retryAfterMs)
      );
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'Too many login attempts. Please try again shortly.'
        })
      );

      return;
    }
  } else {
    logger.warn(
      '[Rate Limiter HTTP] Missing IP address in request info, skipping rate limiting for /login route.'
    );
  }

  if (!existingUser) {
    if (!settings.allowNewUsers) {
      const inviteError = await isInviteValid(data.invite);

      if (inviteError) {
        throw new HttpValidationError('identity', inviteError);
      }

      await db
        .update(invites)
        .set({
          uses: sql`${invites.uses} + 1`
        })
        .where(eq(invites.code, data.invite!))
        .execute();
    }

    // user doesn't exist, but registration is open OR invite was valid - create the user automatically
    existingUser = await registerUser(
      data.identity,
      data.password,
      data.invite,
      connectionInfo?.ip
    );
  }

  if (existingUser.banned) {
    throw new HttpValidationError(
      'identity',
      `Identity banned: ${existingUser.banReason || 'No reason provided'}`
    );
  }

  //Logic to handle legacy SHA256 passwords and migrate them to argon2
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

  const cookie = 
    `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`;

  res.writeHead(200, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Set-Cookie': cookie
  });
  res.end(JSON.stringify({ success: true }));

  return res;
};

export { loginRouteHandler };
