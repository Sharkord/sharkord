import { Permission } from '@sharkord/shared';
import { getUsers } from '../../db/queries/users';
import { clearFields } from '../../helpers/clear-fields';
import { protectedProcedure } from '../../utils/trpc';

const getUsersRoute = protectedProcedure.query(async ({ ctx }) => {
  await ctx.needsPermission(Permission.MANAGE_USERS);

  const users = await getUsers();

  return clearFields(users, ['identity', 'password']);
});

export { getUsersRoute };
