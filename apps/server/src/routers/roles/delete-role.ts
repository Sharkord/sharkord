import { ActivityLogType, Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { fallbackUsersToDefaultRole } from '../../db/mutations/users';
import { publishRole } from '../../db/publishers';
import { getRole } from '../../db/queriesv2/roles';
import { roles } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const deleteRoleRoute = protectedProcedure
  .input(
    z.object({
      roleId: z.number()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_ROLES);

    const role = await getRole(input.roleId);

    invariant(role, 'Role not found');
    invariant(!role.isPersistent, 'Cannot delete a persistent role');
    invariant(!role.isDefault, 'Cannot delete the default role');

    await fallbackUsersToDefaultRole(role.id);
    await db.delete(roles).where(eq(roles.id, role.id));

    publishRole(role.id, 'delete');
    enqueueActivityLog({
      type: ActivityLogType.DELETED_ROLE,
      userId: ctx.user.id,
      details: {
        roleId: role.id,
        roleName: role.name
      }
    });
  });

export { deleteRoleRoute };
