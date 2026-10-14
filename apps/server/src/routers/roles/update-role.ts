import {
  HEX_COLOR_REGEX,
  Permission,
  STORAGE_MAX_QUOTA_PER_USER,
  STORAGE_MIN_QUOTA_PER_USER
} from '@sharkord/shared';
import { z } from 'zod';
import { loadRole, updateRole } from '../../helpers/roles';
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

    const role = await loadRole(input.roleId);

    const addedPermissions = input.permissions.filter(
      (permission) => !role.permissions.includes(permission)
    );

    invariant(await ctx.hasPermission(addedPermissions), {
      code: 'FORBIDDEN',
      message: 'You cannot grant permissions that you do not have.'
    });

    await updateRole(role, input, ctx.user.id);
  });

export { updateRoleRoute };
