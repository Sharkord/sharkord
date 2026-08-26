import type { Permission, TRole } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { db } from '..';
import { rolePermissions, roles, userRoles } from '../schema';

const deleteRoleAndFallbackUsers = (roleId: number, defaultRoleId: number) => {
  db.transaction((tx) => {
    const affectedUsers = tx
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(eq(userRoles.roleId, roleId))
      .all();

    tx.delete(userRoles).where(eq(userRoles.roleId, roleId)).run();

    if (affectedUsers.length > 0) {
      tx.insert(userRoles)
        .values(
          affectedUsers.map(({ userId }) => ({
            userId,
            roleId: defaultRoleId,
            createdAt: Date.now()
          }))
        )
        .onConflictDoNothing()
        .run();
    }

    tx.delete(roles).where(eq(roles.id, roleId)).run();
  });
};

const syncRolePermissions = async (
  roleId: number,
  permissions: Permission[]
): Promise<TRole | undefined> => {
  return db.transaction((tx) => {
    tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId)).run();

    if (permissions.length > 0) {
      const now = Date.now();
      const permissionInserts = permissions.map((permission) => ({
        roleId,
        permission,
        createdAt: now,
        updatedAt: now
      }));

      tx.insert(rolePermissions).values(permissionInserts).run();
    }

    const updatedRole = tx
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1)
      .get();

    return updatedRole;
  });
};

export { deleteRoleAndFallbackUsers, syncRolePermissions };
