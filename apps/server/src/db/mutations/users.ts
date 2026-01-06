import { and, eq } from 'drizzle-orm';
import { db } from '..';
import { invariant } from '../../utils/invariant';
import { getDefaultRole } from '../queries/roles';
import { userRoles } from '../schema';

const fallbackUsersToDefaultRole = async (roleId: number) => {
  const defaultRole = await getDefaultRole();

  invariant(defaultRole, {
    code: 'NOT_FOUND',
    message: 'Default role not found'
  });

  await db.transaction(async (tx) => {
    const affectedUsers = await tx
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(eq(userRoles.roleId, roleId));

    await tx.delete(userRoles).where(eq(userRoles.roleId, roleId));

    for (const { userId } of affectedUsers) {
      const hasDefaultRole = await tx
        .select()
        .from(userRoles)
        .where(
          and(
            eq(userRoles.userId, userId),
            eq(userRoles.roleId, defaultRole.id)
          )
        )
        .limit(1);

      if (hasDefaultRole.length === 0) {
        await tx.insert(userRoles).values({
          userId,
          roleId: defaultRole.id,
          createdAt: Date.now()
        });
      }
    }
  });
};

export { fallbackUsersToDefaultRole };
