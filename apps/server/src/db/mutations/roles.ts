import type { Permission, TRole } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { db } from '..';
import { rolePermissions, roles } from '../schema';

const syncRolePermissions = async (
  roleId: number,
  permissions: Permission[]
): Promise<TRole | undefined> => {
  return await db.transaction(async (tx) => {
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

    if (permissions.length > 0) {
      const now = Date.now();
      const permissionInserts = permissions.map((permission) => ({
        roleId,
        permission,
        createdAt: now,
        updatedAt: now
      }));

      await tx.insert(rolePermissions).values(permissionInserts);
    }

    const updatedRole = await tx
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1)
      .get();

    return updatedRole;
  });
};

export { syncRolePermissions };
