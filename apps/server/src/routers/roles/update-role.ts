import {
  ActivityLogType,
  HEX_COLOR_REGEX,
  OWNER_ROLE_ID,
  Permission,
  STORAGE_MAX_QUOTA_PER_USER,
  STORAGE_MIN_QUOTA_PER_USER
} from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { syncRolePermissions } from '../../db/mutations/roles';
import { publishRole } from '../../db/publishers';
import { getRole } from '../../db/queries/roles';
import { roles } from '../../db/schema';
import { eventBus } from '../../plugins/event-bus';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const updateRoleRoute = protectedProcedure
  .input(
    z.object({
      roleId: z.number().min(1),
      name: z.string().min(1).max(26),
      color: z.string().regex(HEX_COLOR_REGEX, 'Invalid hex color'),
      permissions: z.enum(Permission).array(),
      storageQuotaOverrideEnabled: z.boolean(),
      storageSpaceQuota: z
        .number()
        .min(STORAGE_MIN_QUOTA_PER_USER)
        .max(STORAGE_MAX_QUOTA_PER_USER)
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_ROLES);

    const role = await getRole(input.roleId);

    invariant(role, {
      code: 'NOT_FOUND',
      message: 'Role not found.'
    });

    const addedPermissions = input.permissions.filter(
      (permission) => !role.permissions.includes(permission)
    );

    invariant(await ctx.hasPermission(addedPermissions), {
      code: 'FORBIDDEN',
      message: 'You cannot grant permissions that you do not have.'
    });

    const updatedRole = await db
      .update(roles)
      .set({
        name: input.name,
        color: input.color,
        storageQuotaOverrideEnabled: input.storageQuotaOverrideEnabled,
        storageSpaceQuota: input.storageSpaceQuota
      })
      .where(eq(roles.id, input.roleId))
      .returning()
      .get();

    if (updatedRole.id !== OWNER_ROLE_ID) {
      await syncRolePermissions(updatedRole.id, input.permissions);
    }

    publishRole(updatedRole.id, 'update');

    eventBus.emit('role:updated', {
      roleId: updatedRole.id,
      name: updatedRole.name
    });
    enqueueActivityLog({
      type: ActivityLogType.UPDATED_ROLE,
      userId: ctx.user.id,
      details: {
        roleId: updatedRole.id,
        permissions: input.permissions,
        values: input
      }
    });
  });

export { updateRoleRoute };
