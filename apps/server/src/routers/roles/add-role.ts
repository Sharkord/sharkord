import { Permission } from '@sharkord/shared';
import { createRole } from '../../helpers/roles';
import { protectedProcedure } from '../../utils/trpc';

const addRoleRoute = protectedProcedure.mutation(async ({ ctx }) => {
  await ctx.needsPermission(Permission.MANAGE_ROLES);

  const role = await createRole(
    { name: 'New Role', color: '#ffffff' },
    ctx.user.id
  );

  return role.id;
});

export { addRoleRoute };
