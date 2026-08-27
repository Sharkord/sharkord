import {
  ActivityLogType,
  DELETED_USER_IDENTITY_AND_NAME,
  sha256
} from '@sharkord/shared';
import chalk from 'chalk';
import { eq } from 'drizzle-orm';
import http from 'http';
import jwt from 'jsonwebtoken';
import z from 'zod';
import { config } from '../config';
import { db } from '../db';
import { createUser } from '../db/mutations/users';
import { publishUser } from '../db/publishers';
import { isInviteValid } from '../db/queries/invites';
import { getServerToken, getSettings } from '../db/queries/server';
import { getUserByIdentity } from '../db/queries/users';
import { users } from '../db/schema';
import { getWsInfo } from '../helpers/get-ws-info';
import { isLocalLoginDisabled } from '../helpers/oidc/settings';
import { safeCompare } from '../helpers/safe-compare';
import { logger } from '../logger';
import { enqueueActivityLog } from '../queues/activity-log';
import { createRateLimiter } from '../utils/rate-limiters/rate-limiter';
import { HttpValidationError } from './errors';
import { enforceHttpRateLimit, getJsonBody } from './helpers';

const zBody = z.object({
  identity: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Identity must be at least 1 character long'),
  password: z
    .string()
    .min(4, 'Password must be at least 4 characters long')
    .max(128),
  invite: z.string().optional()
});

const loginRateLimiter = createRateLimiter({
  maxRequests: config.rateLimiters.login.maxRequests,
  windowMs: config.rateLimiters.login.windowMs
});

const GENERIC_LOGIN_ERROR = 'Invalid credentials';

let dummyArgon2HashPromise: Promise<string> | null = null;
const getDummyArgon2Hash = (): Promise<string> => {
  if (!dummyArgon2HashPromise) {
    dummyArgon2HashPromise = Bun.password
      .hash('sharkord-dummy-password-for-timing')
      .catch((error) => {
        dummyArgon2HashPromise = null;
        throw error;
      });
  }
  return dummyArgon2HashPromise;
};

const loginRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const data = zBody.parse(await getJsonBody(req));

  if (data.identity === DELETED_USER_IDENTITY_AND_NAME) {
    throw new HttpValidationError('identity', 'This identity is reserved');
  }

  if (isLocalLoginDisabled()) {
    throw new HttpValidationError(
      'identity',
      'This server only accepts sign in through its identity provider'
    );
  }

  const settings = await getSettings();
  let existingUser = await getUserByIdentity(data.identity);
  const connectionInfo = getWsInfo(undefined, req);

  const allowed = enforceHttpRateLimit(
    res,
    loginRateLimiter,
    connectionInfo?.ip,
    {
      route: '/login',
      message: 'Too many login attempts. Please try again shortly.'
    }
  );

  if (!allowed) return;

  if (!existingUser) {
    let inviteRoleId: number | null = null;

    const result = await isInviteValid(data.invite);

    if (!settings.allowNewUsers && result.error) {
      await Bun.password.verify('dummy', await getDummyArgon2Hash());

      logger.info(
        `${chalk.dim('[Auth]')} Login attempt for unknown identity blocked. (reason: ${result.error}, IP: ${connectionInfo?.ip || 'unknown'})`
      );

      throw new HttpValidationError('identity', GENERIC_LOGIN_ERROR);
    }

    // only consume the invite when one was actually accepted
    const usedInviteCode = result.invite ? data.invite : undefined;

    inviteRoleId = result.invite?.roleId ?? null;

    // user doesn't exist, but registration is open OR invite was valid - create the user automatically
    const registeredUserId = await createUser({
      identity: data.identity,
      hashedPassword: (await Bun.password.hash(data.password)).toString(),
      inviteCode: usedInviteCode,
      inviteRoleId
    });

    existingUser = await getUserByIdentity(data.identity);

    if (!existingUser) {
      throw new Error('User registration failed');
    }

    // published only once the registration transaction has committed
    publishUser(registeredUserId, 'create');

    if (usedInviteCode) {
      enqueueActivityLog({
        type: ActivityLogType.USED_INVITE,
        userId: registeredUserId,
        details: { code: usedInviteCode },
        ip: connectionInfo?.ip
      });
    }
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

    throw new HttpValidationError('identity', GENERIC_LOGIN_ERROR);
  }

  if (existingUser.banned) {
    throw new HttpValidationError(
      'identity',
      `Identity banned: ${existingUser.banReason || 'No reason provided'}`
    );
  }

  const token = jwt.sign(
    { userId: existingUser.id, tokenVersion: existingUser.tokenVersion },
    await getServerToken(),
    {
      expiresIn: '604800s' // 7 days
    }
  );

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true, token }));

  return res;
};

export { loginRouteHandler };
