import {
  ChannelPermission,
  OWNER_ROLE_ID,
  type TChannel,
  type TChannelUserPermissionsMap,
  type TReadStateMap
} from '@sharkord/shared';
import { and, eq, gt, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { db } from '..';
import { getOnlineUserIds } from '../../utils/wss';
import {
  channelReadStates,
  channelRolePermissions,
  channels,
  channelUserPermissions,
  messages,
  userRoles
} from '../schema';
import {
  getDirectMessageChannelIdsForUser,
  getDirectMessageChannelParticipantIds,
  isUserDmParticipant
} from './dms';
import { getUserRoleIds } from './roles';
import { getAllUserIds } from './users';

const getPermissions = async (
  userId: number,
  roleIds: number[],
  permission: ChannelPermission,
  channelId?: number
) => {
  const userPermissionsQuery = db
    .select({
      channelId: channelUserPermissions.channelId,
      allow: channelUserPermissions.allow
    })
    .from(channelUserPermissions)
    .where(
      and(
        eq(channelUserPermissions.userId, userId),
        eq(channelUserPermissions.permission, permission),
        channelId ? eq(channelUserPermissions.channelId, channelId) : undefined
      )
    );

  let rolePermissionsQuery = null;

  if (roleIds.length > 0) {
    rolePermissionsQuery = db
      .select({
        channelId: channelRolePermissions.channelId,
        allow: channelRolePermissions.allow
      })
      .from(channelRolePermissions)
      .where(
        and(
          inArray(channelRolePermissions.roleId, roleIds),
          eq(channelRolePermissions.permission, permission),
          channelId
            ? eq(channelRolePermissions.channelId, channelId)
            : undefined
        )
      );
  }

  const [userPermissions, rolePermissions] = await Promise.all([
    userPermissionsQuery,
    rolePermissionsQuery || Promise.resolve([])
  ]);

  const userPermissionMap = new Map(
    userPermissions.map((p) => [p.channelId, p.allow])
  );

  const rolePermissionMap = new Map<number, boolean>();

  for (const perm of rolePermissions) {
    const existing = rolePermissionMap.get(perm.channelId);

    rolePermissionMap.set(perm.channelId, existing || perm.allow);
  }

  return { userPermissionMap, rolePermissionMap };
};

const resolvePermission = (
  channelId: number,
  {
    userPermissionMap,
    rolePermissionMap
  }: Awaited<ReturnType<typeof getPermissions>>
) => {
  const userPerm = userPermissionMap.get(channelId);

  if (userPerm !== undefined) {
    return userPerm;
  }

  return rolePermissionMap.get(channelId) ?? false;
};

// the single answer to "may this user do X in this channel", used by the ws context and
// therefore by every route. the publishers cannot call it, since they resolve a whole
// audience rather than one user, so getAffectedUserIdsForChannel below reproduces this
// precedence instead: owner role, then the user level row, then the role grant. the two
// have to agree or an event reaches someone a route would have refused
const channelUserCan = async (
  channelId: number,
  userId: number,
  permission: ChannelPermission
): Promise<boolean> => {
  const channel = await db
    .select({ private: channels.private, isDm: channels.isDm })
    .from(channels)
    .where(eq(channels.id, channelId))
    .limit(1)
    .get();

  if (!channel) {
    return false;
  }

  // dm channels have no granular permissions, membership is the whole rule
  if (channel.isDm) {
    return isUserDmParticipant(channelId, userId);
  }

  // public channels grant everything, which is deliberate and disclosed in the
  // channel settings UI (see the corrected 2.1)
  if (!channel.private) {
    return true;
  }

  const roleIds = await getUserRoleIds(userId);

  if (roleIds.includes(OWNER_ROLE_ID)) {
    return true;
  }

  const isViewPermission = permission === ChannelPermission.VIEW_CHANNEL;

  const [viewPermissions, targetPermissions] = await Promise.all([
    getPermissions(userId, roleIds, ChannelPermission.VIEW_CHANNEL, channelId),
    isViewPermission
      ? undefined
      : getPermissions(userId, roleIds, permission, channelId)
  ]);

  // a permission granted on a channel the user cannot see is not a permission
  if (!resolvePermission(channelId, viewPermissions)) {
    return false;
  }

  if (isViewPermission) {
    return true;
  }

  return resolvePermission(channelId, targetPermissions!);
};

const getChannelsForUser = async (userId: number): Promise<TChannel[]> => {
  const roleIds = await getUserRoleIds(userId);

  if (roleIds.includes(OWNER_ROLE_ID)) {
    const [ownerChannels, ownerDmChannelIds] = await Promise.all([
      db.select().from(channels),
      getDirectMessageChannelIdsForUser(userId)
    ]);

    const ownerDmChannelIdSet = new Set(ownerDmChannelIds);

    return ownerChannels.filter(
      (channel) => !channel.isDm || ownerDmChannelIdSet.has(channel.id)
    );
  }

  const [allChannels, { userPermissionMap, rolePermissionMap }, dmChannelIds] =
    await Promise.all([
      db.select().from(channels),
      getPermissions(userId, roleIds, ChannelPermission.VIEW_CHANNEL),
      getDirectMessageChannelIdsForUser(userId)
    ]);

  const dmChannelIdSet = new Set(dmChannelIds);

  const accessibleChannels = allChannels.filter((channel) => {
    const isPublicChannel = !channel.private;
    const isDmChannelParticipant = dmChannelIdSet.has(channel.id);

    if (isPublicChannel || isDmChannelParticipant) {
      return true;
    }

    const userPerm = userPermissionMap.get(channel.id);

    if (userPerm !== undefined) {
      return userPerm;
    }

    const rolePerm = rolePermissionMap.get(channel.id);

    return rolePerm;
  });

  return accessibleChannels;
};

const getAllChannelUserPermissions = async (
  userId: number
): Promise<TChannelUserPermissionsMap> => {
  const roleIds = await getUserRoleIds(userId);

  const [allChannels, dmChannelIds] = await Promise.all([
    db.select({ id: channels.id, isDm: channels.isDm }).from(channels),
    getDirectMessageChannelIdsForUser(userId)
  ]);

  const dmChannelIdSet = new Set(dmChannelIds);

  const userPermissions = await db
    .select({
      channelId: channelUserPermissions.channelId,
      permission: channelUserPermissions.permission,
      allow: channelUserPermissions.allow
    })
    .from(channelUserPermissions)
    .where(eq(channelUserPermissions.userId, userId));

  let rolePermissions: typeof userPermissions = [];

  if (roleIds.length > 0) {
    rolePermissions = await db
      .select({
        channelId: channelRolePermissions.channelId,
        permission: channelRolePermissions.permission,
        allow: channelRolePermissions.allow
      })
      .from(channelRolePermissions)
      .where(inArray(channelRolePermissions.roleId, roleIds));
  }

  const userPermMap = new Map<number, Map<ChannelPermission, boolean>>();

  for (const perm of userPermissions) {
    if (!userPermMap.has(perm.channelId)) {
      userPermMap.set(perm.channelId, new Map());
    }

    userPermMap
      .get(perm.channelId)!
      .set(perm.permission as ChannelPermission, perm.allow);
  }

  const rolePermMap = new Map<number, Map<ChannelPermission, boolean>>();

  for (const perm of rolePermissions) {
    if (!rolePermMap.has(perm.channelId)) {
      rolePermMap.set(perm.channelId, new Map());
    }

    const channelMap = rolePermMap.get(perm.channelId)!;
    const existing = channelMap.get(perm.permission as ChannelPermission);

    channelMap.set(
      perm.permission as ChannelPermission,
      existing || perm.allow
    );
  }

  const allPermissionTypes = Object.values(ChannelPermission);

  const channelPermissions: Record<
    number,
    { channelId: number; permissions: Record<ChannelPermission, boolean> }
  > = {};

  for (const channel of allChannels) {
    const permissions: Record<string, boolean> = {};

    for (const permissionType of allPermissionTypes) {
      const userPerm = userPermMap.get(channel.id)?.get(permissionType);

      if (userPerm !== undefined) {
        permissions[permissionType] = userPerm;

        continue;
      }

      const rolePerm = rolePermMap.get(channel.id)?.get(permissionType);

      if (rolePerm !== undefined) {
        permissions[permissionType] = rolePerm;

        continue;
      }

      permissions[permissionType] = false;
    }

    // dm channels have no granular permissions, membership decides everything.
    // Resolved from one query above rather than one per dm channel in this loop
    if (channel.isDm && dmChannelIdSet.has(channel.id)) {
      for (const permissionType of allPermissionTypes) {
        permissions[permissionType] = true;
      }
    }

    channelPermissions[channel.id] = {
      channelId: channel.id,
      permissions: permissions as Record<ChannelPermission, boolean>
    };
  }

  return channelPermissions;
};

const getAffectedUserIdsForChannel = async (
  channelId: number,
  permission: ChannelPermission
): Promise<number[]> => {
  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.id, channelId))
    .limit(1);

  if (!channel) {
    return [];
  }

  if (channel.isDm) {
    // for DM channels we need to get the two participants and return them as the affected users
    return getDirectMessageChannelParticipantIds(channelId);
  }

  // if channel is public, return all user IDs
  if (!channel.private) {
    return getAllUserIds();
  }

  // both sides of the user level rows, not just the grants: a deny has to beat a role grant
  // here exactly as resolvePermission makes it beat one in channelUserCan
  const userPermissionRows = await db
    .select({
      userId: channelUserPermissions.userId,
      allow: channelUserPermissions.allow
    })
    .from(channelUserPermissions)
    .where(
      and(
        eq(channelUserPermissions.channelId, channelId),
        eq(channelUserPermissions.permission, permission)
      )
    );

  const deniedUserIds = new Set(
    userPermissionRows.filter((row) => !row.allow).map((row) => row.userId)
  );

  const rolesWithPerms = await db
    .select({ roleId: channelRolePermissions.roleId })
    .from(channelRolePermissions)
    .where(
      and(
        eq(channelRolePermissions.channelId, channelId),
        eq(channelRolePermissions.permission, permission),
        eq(channelRolePermissions.allow, true)
      )
    );

  const roleIds = rolesWithPerms.map((r) => r.roleId);

  let usersWithRoles: { userId: number }[] = [];

  if (roleIds.length > 0) {
    usersWithRoles = await db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(inArray(userRoles.roleId, roleIds));
  }

  // get users with the owner role because they have access to everything all the time
  const owners = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(eq(userRoles.roleId, OWNER_ROLE_ID));

  const userIdSet = new Set<number>();

  userPermissionRows
    .filter((row) => row.allow)
    .forEach((row) => userIdSet.add(row.userId));

  usersWithRoles.forEach((u) => {
    if (!deniedUserIds.has(u.userId)) userIdSet.add(u.userId);
  });

  owners.forEach((u) => userIdSet.add(u.userId));

  return Array.from(userIdSet);
};

const getAffectedOnlineUserIdsForChannel = async (
  channelId: number,
  permission: ChannelPermission
): Promise<number[]> => {
  const onlineUserIds = getOnlineUserIds();

  if (onlineUserIds.length === 0) return [];

  const channel = await db
    .select({ private: channels.private, isDm: channels.isDm })
    .from(channels)
    .where(eq(channels.id, channelId))
    .limit(1)
    .get();

  if (!channel) return [];

  // every online user is affected by definition, so there is no point reading
  // the users table to intersect it with itself
  if (!channel.private && !channel.isDm) {
    return onlineUserIds;
  }

  const affectedUserIds = new Set(
    await getAffectedUserIdsForChannel(channelId, permission)
  );

  return onlineUserIds.filter((userId) => affectedUserIds.has(userId));
};

const getChannelsReadStatesForUser = async (
  userId: number,
  channelId?: number
): Promise<TReadStateMap> => {
  // get DM channel IDs the user participates in so we can exclude
  // DM channels between other users from the read state results
  const dmChannelIds = await getDirectMessageChannelIdsForUser(userId);

  const conditions = [];

  if (channelId) {
    conditions.push(eq(channels.id, channelId));
  }

  // a channel that has never had a message gets no entry at all, which is what
  // the messages-driven query used to produce implicitly. An index seek, unlike
  // the scan it replaces
  conditions.push(
    sql`EXISTS (SELECT 1 FROM messages m WHERE m.channel_id = ${channels.id})`
  );

  // exclude DM channels the user does not participate in: keep the channel if it
  // is not a DM, or if it is one the user belongs to
  if (dmChannelIds.length > 0) {
    conditions.push(
      or(eq(channels.isDm, false), inArray(channels.id, dmChannelIds))
    );
  } else {
    conditions.push(eq(channels.isDm, false));
  }

  // driven from channels rather than messages, and every unread predicate sits
  // in the join instead of a COUNT(CASE ...) over the whole table: a channel the
  // user has caught up on costs an index seek rather than a scan of its history
  const results = await db
    .select({
      channelId: channels.id,
      unreadCount: sql<number>`COUNT(${messages.id})`.as('unread_count')
    })
    .from(channels)
    .leftJoin(
      channelReadStates,
      and(
        eq(channelReadStates.channelId, channels.id),
        eq(channelReadStates.userId, userId)
      )
    )
    .leftJoin(
      messages,
      and(
        eq(messages.channelId, channels.id),
        ne(messages.userId, userId),
        isNull(messages.parentMessageId),
        or(
          isNull(channelReadStates.lastReadMessageId),
          gt(messages.id, channelReadStates.lastReadMessageId)
        )
      )
    )
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(channels.id);

  const readStateMap: TReadStateMap = {};

  for (const result of results) {
    readStateMap[result.channelId] = result.unreadCount;
  }

  return readStateMap;
};

export {
  channelUserCan,
  getAffectedOnlineUserIdsForChannel,
  getAffectedUserIdsForChannel,
  getAllChannelUserPermissions,
  getChannelsForUser,
  getChannelsReadStatesForUser
};
