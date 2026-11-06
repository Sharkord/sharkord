import { Permission } from '@sharkord/shared';
import { getUsers } from '../../db/queries/users';
import { clearFields } from '../../helpers/clear-fields';
import { protectedProcedure } from '../../utils/trpc';
import { getUserWsCount } from '../../utils/wss';

const getUsersRoute = protectedProcedure.query(async ({ ctx }) => {
  await ctx.needsPermission(Permission.MANAGE_USERS);

  const users = await getUsers();

  const cleanUsers = clearFields(users, [
    'identity',
    'password',
    'tokenVersion',
    'oidcSub',
    'oidcIssuer'
  ]);

  return cleanUsers.map((user) => ({
    ...user,
    sessionCount: getUserWsCount(user.id)
  }));
});

export { getUsersRoute };
