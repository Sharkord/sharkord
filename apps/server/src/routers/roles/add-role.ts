import { ActivityLogType, Permission } from '@sharkord/shared';
import { db } from '../../db';
import { publishRole } from '../../db/publishers';
import { roles } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';
import { invariant } from '../../utils/invariant';
import { max } from 'drizzle-orm';

const addRoleRoute = protectedProcedure.mutation(async ({ ctx }) => {
  await ctx.needsPermission(Permission.MANAGE_ROLES);

  const maxRoleOrderNr = await db
    .select({ orderNr: max(roles.orderNr) })
    .from(roles)
    .where();

  let newOrderNr = 0;
  if (maxRoleOrderNr.length > 0 && maxRoleOrderNr[0].orderNr) {
    newOrderNr = maxRoleOrderNr[0].orderNr + 1;
  }

  const role = await db
    .insert(roles)
    .values({
      name: 'New Role',
      color: '#ffffff',
      isDefault: false,
      isPersistent: false,
      createdAt: Date.now(),
      orderNr: newOrderNr
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
