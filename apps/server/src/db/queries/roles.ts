import {
  OWNER_ROLE_ID,
  type Permission,
  type TJoinedRole,
  type TRole
} from '@sharkord/shared';
import { and, eq, getTableColumns, inArray, sql } from 'drizzle-orm';
import { db } from '..';
import { rolePermissions, roles, userRoles } from '../schema';
type TQueryResult = TRole & {
  permissions: string | null;
};

const roleSelectFields = {
  ...getTableColumns(roles),
  permissions: sql<string>`group_concat(${rolePermissions.permission}, ',')`.as(
    'permissions'
  )
};

const parseRole = (role: TQueryResult): TJoinedRole => ({
  ...role,
  permissions: role.permissions
    ? (role.permissions.split(',') as Permission[])
    : []
});

const getDefaultRole = async (): Promise<TRole | undefined> =>
  db.select().from(roles).where(eq(roles.isDefault, true)).get();

const getRole = async (roleId: number): Promise<TJoinedRole | undefined> => {
  const role = await db
    .select(roleSelectFields)
    .from(roles)
    .leftJoin(rolePermissions, sql`${roles.id} = ${rolePermissions.roleId}`)
    .where(sql`${roles.id} = ${roleId}`)
    .groupBy(roles.id)
    .limit(1)
    .get();

  if (!role) return undefined;

  return parseRole(role);
};

const getRoles = async (): Promise<TJoinedRole[]> => {
  const results = await db
    .select(roleSelectFields)
    .from(roles)
    .leftJoin(rolePermissions, sql`${roles.id} = ${rolePermissions.roleId}`)
    .groupBy(roles.id);

  return results.map(parseRole);
};

const getUserRoleIds = async (userId: number): Promise<number[]> => {
  const userRoleRecords = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));

  return userRoleRecords.map((ur) => ur.roleId);
};

// server-level permission check for an arbitrary user (the context's
// hasPermission is bound to the caller). Mirrors channelUserCan's shape:
// owner short-circuit + a single lookup over the user's roles.
const userCan = async (
  userId: number,
  permission: Permission
): Promise<boolean> => {
  const roleIds = await getUserRoleIds(userId);

  if (roleIds.includes(OWNER_ROLE_ID)) return true;
  if (roleIds.length === 0) return false;

  const match = await db
    .select({ permission: rolePermissions.permission })
    .from(rolePermissions)
    .where(
      and(
        inArray(rolePermissions.roleId, roleIds),
        eq(rolePermissions.permission, permission)
      )
    )
    .limit(1)
    .get();

  return !!match;
};

const getUserRoles = async (userId: number): Promise<TJoinedRole[]> => {
  const result = await db
    .select({
      role: roles,
      permission: rolePermissions.permission
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .where(eq(userRoles.userId, userId));

  if (result.length === 0) return [];

  const rolesMap = new Map<number, TJoinedRole>();

  for (const row of result) {
    const roleId = row.role.id;

    if (!rolesMap.has(roleId)) {
      rolesMap.set(roleId, {
        ...row.role,
        permissions: []
      });
    }

    if (row.permission) {
      rolesMap.get(roleId)!.permissions.push(row.permission as Permission);
    }
  }

  return Array.from(rolesMap.values());
};

const getEffectiveStorageSpaceQuotaByUserId = async (
  userId: number,
  fallbackQuota: number
): Promise<number> => {
  const overrideRoles = await db
    .select({ storageSpaceQuota: roles.storageSpaceQuota })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(roles.storageQuotaOverrideEnabled, true)
      )
    );

  if (overrideRoles.length === 0) {
    return fallbackQuota;
  }

  if (overrideRoles.some((role) => role.storageSpaceQuota === 0)) {
    return 0;
  }

  return Math.max(...overrideRoles.map((role) => role.storageSpaceQuota));
};

export {
  getDefaultRole,
  getEffectiveStorageSpaceQuotaByUserId,
  getRole,
  getRoles,
  getUserRoleIds,
  getUserRoles,
  userCan
};
