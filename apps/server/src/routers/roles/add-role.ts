import { ActivityLogType, Permission } from '@sharkord/shared';
import { db } from '../../db';
import { publishRole } from '../../db/publishers';
import { roles } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const addRoleRoute = protectedProcedure.mutation(async ({ ctx }) => {
  await ctx.needsPermission(Permission.MANAGE_ROLES);

  const role = await db
    .insert(roles)
    .values({
      name: 'New Role',
      color: '#ffffff',
      isDefault: false,
      isPersistent: false,
      createdAt: Date.now()
    })
    .returning()
    .get();

  publishRole(role.id, 'create');
  enqueueActivityLog({
    type: ActivityLogType.CREATED_ROLE,
    userId: ctx.user.id,
    details: {
      roleId: role.id,
      roleName: role.name
    }
  });

  return role.id;
});

export { addRoleRoute };
