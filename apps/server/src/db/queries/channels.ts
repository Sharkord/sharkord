import {
  ChannelPermission,
  OWNER_ROLE_ID,
  type TChannel,
  type TChannelUserPermissionsMap,
  type TReadStateMap
} from '@sharkord/shared';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '..';
import {
  channelReadStates,
  channelRolePermissions,
  channels,
  channelUserPermissions,
  messages,
  userRoles,
  users
} from '../schema';
import { getUserRoleIds } from './roles';

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

const channelUserCan = async (
  channelId: number,
  userId: number,
  permission: ChannelPermission
): Promise<boolean> => {
  const roleIds = await getUserRoleIds(userId);

  if (roleIds.includes(OWNER_ROLE_ID)) {
    return true;
  }

  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.id, channelId))
    .limit(1);

  if (!channel) {
    return false;
  }

  if (!channel.private) {
    return true;
  }

  const { userPermissionMap, rolePermissionMap } = await getPermissions(
    userId,
    roleIds,
    permission,
    channelId
  );

  const userPerm = userPermissionMap.get(channelId);

  if (userPerm !== undefined) {
    return userPerm;
  }

  const rolePerm = rolePermissionMap.get(channelId);

  if (rolePerm !== undefined) {
    return rolePerm;
  }

  return false;
};

const getChannelsForUser = async (userId: number): Promise<TChannel[]> => {
  const roleIds = await getUserRoleIds(userId);

  if (roleIds.includes(OWNER_ROLE_ID)) {
    return await db.select().from(channels);
  }

  const allChannels = await db.select().from(channels);

  const { userPermissionMap, rolePermissionMap } = await getPermissions(
    userId,
    roleIds,
    ChannelPermission.VIEW_CHANNEL
  );

  const accessibleChannels = allChannels.filter((channel) => {
    if (!channel.private) {
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
  const allChannels = await db.select().from(channels);

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

    channelPermissions[channel.id] = {
      channelId: channel.id,
      permissions: permissions as Record<ChannelPermission, boolean>
    };
  }

  return channelPermissions;
};

const getRoleChannelPermissions = async (
  roleId: number,
  channelId: number
): Promise<Record<ChannelPermission, boolean>> => {
  const rolePermissions = await db
    .select({
      permission: channelRolePermissions.permission,
      allow: channelRolePermissions.allow
    })
    .from(channelRolePermissions)
    .where(
      and(
        eq(channelRolePermissions.roleId, roleId),
        eq(channelRolePermissions.channelId, channelId)
      )
    );

  const allPermissionTypes = Object.values(ChannelPermission);
  const permissions: Record<string, boolean> = {};

  const permissionMap = new Map(
    rolePermissions.map((p) => [p.permission as ChannelPermission, p.allow])
  );

  for (const permissionType of allPermissionTypes) {
    permissions[permissionType] = permissionMap.get(permissionType) ?? false;
  }

  return permissions;
};

const getUserChannelPermissions = async (
  userId: number,
  channelId: number
): Promise<Record<ChannelPermission, boolean>> => {
  const userPermissions = await db
    .select({
      permission: channelUserPermissions.permission,
      allow: channelUserPermissions.allow
    })
    .from(channelUserPermissions)
    .where(
      and(
        eq(channelUserPermissions.userId, userId),
        eq(channelUserPermissions.channelId, channelId)
      )
    );

  const allPermissionTypes = Object.values(ChannelPermission);
  const permissions: Record<string, boolean> = {};

  const permissionMap = new Map(
    userPermissions.map((p) => [p.permission as ChannelPermission, p.allow])
  );

  for (const permissionType of allPermissionTypes) {
    permissions[permissionType] = permissionMap.get(permissionType) ?? false;
  }

  return permissions;
};

const getAffectedUserIdsForChannel = async (
  channelId: number,
  options?: {
    forceAllUsers?: boolean;
    permission?: ChannelPermission;
  }
): Promise<number[]> => {
  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.id, channelId))
    .limit(1);

  if (!channel) {
    return [];
  }

  // if channel is public, return all user IDs
  if (!channel.private || options?.forceAllUsers) {
    const allUsers = await db.select({ id: users.id }).from(users);

    return allUsers.map((user) => user.id);
  }

  // if a specific permission is required, filter by it
  const permission = options?.permission;

  const usersWithDirectPerms = await db
    .select({ userId: channelUserPermissions.userId })
    .from(channelUserPermissions)
    .where(
      and(
        eq(channelUserPermissions.channelId, channelId),
        permission
          ? eq(channelUserPermissions.permission, permission)
          : undefined,
        permission ? eq(channelUserPermissions.allow, true) : undefined
      )
    );

  const rolesWithPerms = await db
    .select({ roleId: channelRolePermissions.roleId })
    .from(channelRolePermissions)
    .where(
      and(
        eq(channelRolePermissions.channelId, channelId),
        permission
          ? eq(channelRolePermissions.permission, permission)
          : undefined,
        permission ? eq(channelRolePermissions.allow, true) : undefined
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

  usersWithDirectPerms.forEach((u) => userIdSet.add(u.userId));
  usersWithRoles.forEach((u) => userIdSet.add(u.userId));
  owners.forEach((u) => userIdSet.add(u.userId));

  return Array.from(userIdSet);
};

const getChannelsReadStatesForUser = async (
  userId: number,
  channelId?: number
): Promise<TReadStateMap> => {
  const results = await db
    .select({
      channelId: messages.channelId,
      unreadCount: sql<number>`
        COUNT(CASE
          WHEN ${messages.userId} != ${userId}
            AND (${channelReadStates.lastReadMessageId} IS NULL
              OR ${messages.id} > ${channelReadStates.lastReadMessageId})
          THEN 1
        END)
      `.as('unread_count')
    })
    .from(messages)
    .leftJoin(
      channelReadStates,
      and(
        eq(channelReadStates.channelId, messages.channelId),
        eq(channelReadStates.userId, userId)
      )
    )
    .where(channelId ? eq(messages.channelId, channelId) : undefined)
    .groupBy(messages.channelId);

  const readStateMap: TReadStateMap = {};

  for (const result of results) {
    readStateMap[result.channelId] = result.unreadCount;
  }

  return readStateMap;
};

export {
  channelUserCan,
  getAffectedUserIdsForChannel,
  getAllChannelUserPermissions,
  getChannelsForUser,
  getChannelsReadStatesForUser,
  getRoleChannelPermissions,
  getUserChannelPermissions
};
