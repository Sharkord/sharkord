import { ActivityLogType, DisconnectCode } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { invalidateUserSessions } from '../db/mutations/users';
import { publishUser } from '../db/publishers';
import { users } from '../db/schema';
import { eventBus } from '../plugins/event-bus';
import { enqueueActivityLog } from '../queues/activity-log';
import { invariant } from '../utils/invariant';
import type { Context } from '../utils/trpc';
import { disconnectUser, getUserWsCount } from '../utils/wss';

type TUserSessions = {
  count: () => number;
  close: (code: DisconnectCode, reason?: string) => void;
};

const serverUserSessions = (userId: number): TUserSessions => ({
  count: () => getUserWsCount(userId),
  close: (code, reason) => disconnectUser(userId, code, reason)
});

const ctxUserSessions = (ctx: Context, userId: number): TUserSessions => ({
  count: () => ctx.getUserWs(userId).length,
  close: (code, reason) =>
    ctx.getUserWs(userId).forEach((socket) => socket.close(code, reason))
});

const assertUserExists = async (userId: number) => {
  const targetUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .get();

  invariant(targetUser, {
    code: 'NOT_FOUND',
    message: 'User not found.'
  });
};

const banUser = async (
  userId: number,
  reason: string | undefined,
  actorUserId: number | null,
  sessions: TUserSessions
) => {
  await assertUserExists(userId);

  // closed before the row changes, so a banned session cannot act in the gap
  sessions.close(DisconnectCode.BANNED, reason);

  await db
    .update(users)
    .set({
      banned: true,
      banReason: reason ?? null,
      bannedAt: Date.now()
    })
    .where(eq(users.id, userId));

  publishUser(userId, 'update');

  eventBus.emit('user:banned', {
    userId,
    reason,
    actorUserId: actorUserId ?? undefined
  });

  enqueueActivityLog({
    type: ActivityLogType.USER_BANNED,
    userId,
    details: { reason, bannedBy: actorUserId ?? undefined }
  });
};

const unbanUser = async (userId: number, actorUserId: number | null) => {
  await assertUserExists(userId);

  await db
    .update(users)
    .set({ banned: false, banReason: null, bannedAt: null })
    .where(eq(users.id, userId));

  publishUser(userId, 'update');

  eventBus.emit('user:unbanned', {
    userId,
    actorUserId: actorUserId ?? undefined
  });

  enqueueActivityLog({
    type: ActivityLogType.USER_UNBANNED,
    userId,
    details: { unbannedBy: actorUserId ?? undefined }
  });
};

const kickUser = async (
  userId: number,
  reason: string | undefined,
  actorUserId: number | null,
  sessions: TUserSessions
) => {
  invariant(sessions.count() > 0, {
    code: 'NOT_FOUND',
    message: 'User is not connected'
  });

  await invalidateUserSessions(userId);

  sessions.close(DisconnectCode.KICKED, reason);

  eventBus.emit('user:kicked', {
    userId,
    reason,
    actorUserId: actorUserId ?? undefined
  });

  enqueueActivityLog({
    type: ActivityLogType.USER_KICKED,
    userId,
    details: { reason, kickedBy: actorUserId ?? undefined }
  });
};

export { banUser, ctxUserSessions, kickUser, serverUserSessions, unbanUser };
export type { TUserSessions };
