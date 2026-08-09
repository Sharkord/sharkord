import { ActivityLogType, Permission } from '@sharkord/shared';
import { z } from 'zod';
import { deleteRoleAndFallbackUsers } from '../../db/mutations/roles';
import { publishRole } from '../../db/publishers';
import { getDefaultRole, getRole } from '../../db/queries/roles';
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

    invariant(role, {
      code: 'NOT_FOUND',
      message: 'Role not found'
    });
    invariant(!role.isPersistent, {
      code: 'FORBIDDEN',
      message: 'Cannot delete a persistent role'
    });
    invariant(!role.isDefault, {
      code: 'FORBIDDEN',
      message: 'Cannot delete the default role'
    });

    const defaultRole = await getDefaultRole();

    invariant(defaultRole, {
      code: 'NOT_FOUND',
      message: 'Default role not found'
    });

    deleteRoleAndFallbackUsers(role.id, defaultRole.id);

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
