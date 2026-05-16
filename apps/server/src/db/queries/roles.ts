import type { Permission, TJoinedRole, TRole } from '@sharkord/shared';
import { and, eq, getTableColumns, sql } from 'drizzle-orm';
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
  getUserRoleIds
};
