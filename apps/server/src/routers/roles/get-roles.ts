import { Permission } from '@sharkord/shared';
import { getRoles } from '../../db/queries/roles';
import { protectedProcedure } from '../../utils/trpc';

const getRolesRouter = protectedProcedure.query(async ({ ctx }) => {
  await ctx.needsPermission(Permission.MANAGE_ROLES);

  const roles = await getRoles();

  return roles;
});

export { getRolesRouter };
