import type { TJoinedRole } from '@sharkord/shared';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { publishChannelListChange, publishUser } from '../db/publishers';
import { getChannelsForUser } from '../db/queries/channels';
import { userRoles } from '../db/schema';
import { eventBus } from '../plugins/event-bus';
import { invariant } from '../utils/invariant';

const assignRole = async (userId: number, role: TJoinedRole) => {
  const roleId = role.id;

  const existing = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)))
    .limit(1);

  invariant(existing.length === 0, {
    code: 'CONFLICT',
    message: 'User already has this role'
  });

  const channelsBefore = await getChannelsForUser(userId);

  await db.insert(userRoles).values({
    userId,
    roleId,
    createdAt: Date.now()
  });

  publishUser(userId, 'update');

  eventBus.emit('role:assigned', { userId, roleId });

  await publishChannelListChange(
    userId,
    channelsBefore.map((channel) => channel.id)
  );
};

const removeRole = async (userId: number, role: TJoinedRole) => {
  const roleId = role.id;

  const existing = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)))
    .limit(1);

  invariant(existing.length > 0, {
    code: 'NOT_FOUND',
    message: 'User does not have this role'
  });

  const channelsBefore = await getChannelsForUser(userId);

  await db
    .delete(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));

  publishUser(userId, 'update');

  eventBus.emit('role:removed', { userId, roleId });

  await publishChannelListChange(
    userId,
    channelsBefore.map((channel) => channel.id)
  );
};

export { assignRole, removeRole };
