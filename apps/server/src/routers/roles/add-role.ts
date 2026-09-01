import { ActivityLogType, Permission } from '@sharkord/shared';
import { count } from 'drizzle-orm';
import { config } from '../../config';
import { db } from '../../db';
import { publishRole } from '../../db/publishers';
import { roles } from '../../db/schema';
import { eventBus } from '../../plugins/event-bus';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const MAX_ROLES = 100;

const addRoleRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.adminCreate.maxRequests,
  windowMs: config.rateLimiters.adminCreate.windowMs,
  logLabel: 'addRole'
}).mutation(async ({ ctx }) => {
  await ctx.needsPermission(Permission.MANAGE_ROLES);

  const [existing] = await db.select({ total: count() }).from(roles);

  invariant((existing?.total ?? 0) < MAX_ROLES, {
    code: 'BAD_REQUEST',
    message: `This server cannot have more than ${MAX_ROLES} roles.`
  });

  const role = await db
    .insert(roles)
    .values({
      name: 'New Role',
      color: '#ffffff',
      isDefault: false,
      isPersistent: false,
      storageQuotaOverrideEnabled: false,
      storageSpaceQuota: 0,
      createdAt: Date.now()
    })
    .returning()
    .get();

  publishRole(role.id, 'create');

  eventBus.emit('role:created', { roleId: role.id, name: role.name });

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
