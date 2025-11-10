import { ActivityLogType, sha256, type TJoinedUser } from '@sharkord/shared';
import http from 'http';
import jwt from 'jsonwebtoken';
import z from 'zod';
import { addInviteUse } from '../db/mutations/invites/add-invite-use';
import { createUser } from '../db/mutations/users/create-user';
import { publishUser } from '../db/publishers';
import { isInviteValid } from '../db/queries/invites/is-invite-valid';
import { getServerToken } from '../db/queries/others/get-server-token';
import { getSettings } from '../db/queries/others/get-settings';
import { getUserByIdentity } from '../db/queries/users/get-user-by-identity';
import { getWsInfo } from '../helpers/get-ws-info';
import { enqueueActivityLog } from '../queues/activity-log';
import { getJsonBody } from './helpers';
import { HttpValidationError } from './utils';

const zBody = z.object({
  identity: z.string(),
  password: z.string(),
  invite: z.string().optional()
});

const registerUser = async (
  identity: string,
  password: string,
  inviteCode?: string,
  ip?: string
): Promise<TJoinedUser> => {
  const hashedPassword = await sha256(password);
  const createdUser = await createUser(identity, hashedPassword);

  await publishUser(createdUser.id, 'create');

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
  const settings = await getSettings();
  let existingUser = await getUserByIdentity(data.identity);
  const connectionInfo = getWsInfo(undefined, req);

  if (!existingUser) {
    if (!settings.allowNewUsers) {
      const inviteError = await isInviteValid(data.invite);

      if (inviteError) {
        throw new HttpValidationError('identity', inviteError);
      }

      await addInviteUse(data.invite!);
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

  const hashedPassword = await sha256(data.password);
  const passwordMatches = existingUser.password === hashedPassword;

  if (!passwordMatches) {
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
