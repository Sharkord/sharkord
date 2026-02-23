import {
  ActivityLogType,
  DELETED_USER_IDENTITY_AND_NAME,
  type TJoinedUser
} from '@sharkord/shared';
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
import { enqueueActivityLog } from '../queues/activity-log';
import { invariant } from '../utils/invariant';
import { createRateLimiter } from '../utils/rate-limiters/rate-limiter';
import { getJsonBody } from './helpers';
import { applyRateLimit, HttpValidationError } from './utils';

const zBody = z.object({
  identity: z.string().trim().min(1, 'Identity is required'),
  password: z.string().min(4, 'Password is required').max(128),
  displayName: z.string().trim().min(1, 'Display name is required'),
  invite: z.string().optional()
});

const registerRateLimiter = createRateLimiter({
  maxRequests: config.rateLimiters.joinServer.maxRequests,
  windowMs: config.rateLimiters.joinServer.windowMs
});

const registerUser = async (
  identity: string,
  password: string,
  displayName: string,
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
      name: displayName,
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

const registerRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const data = zBody.parse(await getJsonBody(req));

  const settings = await getSettings();

  const connectionInfo = getWsInfo(undefined, req);

  const rateLimited = applyRateLimit(
    registerRateLimiter,
    res,
    '/register',
    connectionInfo?.ip
  );
  if (rateLimited) return;

  if (data.identity === DELETED_USER_IDENTITY_AND_NAME) {
    throw new HttpValidationError('identity', 'This identity is reserved');
  }

  const existingUser = await getUserByIdentity(data.identity);
  if (existingUser)
    throw new HttpValidationError('identity', 'User already exists');

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

  const newUser = await registerUser(
    data.identity,
    data.password,
    data.displayName,
    data.invite,
    connectionInfo?.ip
  );

  const token = jwt.sign({ userId: newUser.id }, await getServerToken(), {
    expiresIn: '86400s' // 1 day
  });

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true, token }));

  return res;
};

export { registerRouteHandler };
