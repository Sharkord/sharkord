import {
  ActivityLogType,
  DELETED_USER_IDENTITY_AND_NAME,
  sha256
} from '@sharkord/shared';
import chalk from 'chalk';
import { and, eq, isNull, lt, max, or, sql } from 'drizzle-orm';
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
import {
  channelReadStates,
  channels,
  invites,
  messages,
  userRoles,
  users
} from '../db/schema';
import { getWsInfo } from '../helpers/get-ws-info';
import { safeCompare } from '../helpers/safe-compare';
import { logger } from '../logger';
import { enqueueActivityLog } from '../queues/activity-log';
import { invariant } from '../utils/invariant';
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

// creates the user, its roles, the invite consumption and the read state
// backfill as one unit. nothing here may publish or enqueue: a rollback has to
// leave no trace outside the database
const registerUser = async (
  identity: string,
  password: string,
  inviteCode?: string,
  inviteRoleId?: number | null
): Promise<number> => {
  const hashedPassword = (await Bun.password.hash(password)).toString();

  const defaultRole = await getDefaultRole();

  invariant(defaultRole, {
    code: 'NOT_FOUND',
    message: 'Default role not found'
  });

  const randomNum = Math.floor(Math.random() * 99999) + 10000; // between 10000 and 99999 to ensure it's always 5 digits, for better readability

  return db.transaction((tx) => {
    if (inviteCode) {
      const consumed = tx
        .update(invites)
        .set({ uses: sql`${invites.uses} + 1` })
        .where(
          and(
            eq(invites.code, inviteCode),
            or(isNull(invites.maxUses), lt(invites.uses, invites.maxUses))
          )
        )
        .returning({ id: invites.id })
        .all();

      if (consumed.length === 0) {
        throw new HttpValidationError(
          'identity',
          'This invite code has reached its maximum uses'
        );
      }
    }

    const user = tx
      .insert(users)
      .values({
        name: `SharkordUser${randomNum}`,
        identity,
        createdAt: Date.now(),
        password: hashedPassword
      })
      .returning()
      .get();

    tx.insert(userRoles)
      .values({
        roleId: defaultRole.id,
        userId: user.id,
        createdAt: Date.now()
      })
      .run();

    // if the invite has a specific role and it's different from the default, assign it too
    if (inviteRoleId && inviteRoleId !== defaultRole.id) {
      tx.insert(userRoles)
        .values({
          roleId: inviteRoleId,
          userId: user.id,
          createdAt: Date.now()
        })
        .run();
    }

    // mark all existing messages as read so the new user doesn't see
    // a flood of unread messages on first join.
    //
    // driven off channels rather than grouping over messages: there are tens of channels
    // and potentially millions of messages, so this is one index seek per channel instead
    // of a full scan plus a temp b-tree. measured on 500k messages across 40 channels,
    // the group-by shape cost ~100ms and this costs ~0.02ms, and it runs inline on an
    // unauthenticated request
    const latestTopLevelMessageId = tx
      .select({ value: max(messages.id) })
      .from(messages)
      .where(
        and(
          eq(messages.channelId, channels.id),
          isNull(messages.parentMessageId)
        )
      );

    const latestMessagePerChannel = tx
      .select({
        channelId: channels.id,
        latestMessageId: sql<
          number | null
        >`(${latestTopLevelMessageId})`.mapWith(Number)
      })
      .from(channels)
      .all();

    const readStateValues = latestMessagePerChannel
      .filter((row) => !!row.latestMessageId)
      .map((row) => ({
        channelId: row.channelId,
        userId: user.id,
        lastReadMessageId: row.latestMessageId!,
        lastReadAt: Date.now()
      }));

    if (readStateValues.length > 0) {
      tx.insert(channelReadStates).values(readStateValues).run();
    }

    return user.id;
  });
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
    const registeredUserId = await registerUser(
      data.identity,
      data.password,
      usedInviteCode,
      inviteRoleId
    );

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
