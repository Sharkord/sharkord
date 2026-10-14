import { Permission } from '@sharkord/shared';
import { config } from '../../config';
import { createRole } from '../../helpers/roles';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const addRoleRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.adminCreate.maxRequests,
  windowMs: config.rateLimiters.adminCreate.windowMs,
  logLabel: 'addRole'
}).mutation(async ({ ctx }) => {
  await ctx.needsPermission(Permission.MANAGE_ROLES);

  const role = await createRole(
    { name: 'New Role', color: '#ffffff' },
    ctx.user.id
  );

  return role.id;
});

export { addRoleRoute };
