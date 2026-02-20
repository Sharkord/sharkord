import { Permission } from '@sharkord/shared';
import z from 'zod';
import { getFilesByUserId } from '../../db/queries/files';
import { getLastLogins } from '../../db/queries/logins';
import { getMessagesByUserId } from '../../db/queries/messages';
import { getUserById } from '../../db/queries/users';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';
import { clearFields } from '../../helpers/clear-fields';

const getUserInfoRoute = protectedProcedure
  .input(
    z.object({
      userId: z.number()
    })
  )
  .query(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_USERS);

    const user = await getUserById(input.userId);

    invariant(user, {
      code: 'NOT_FOUND',
      message: 'User not found'
    });

    const [logins, files, messages] = await Promise.all([
      getLastLogins(user.id, 6),
      getFilesByUserId(user.id),
      getMessagesByUserId(user.id)
    ]);

    return { user: clearFields(user, ['password']), logins, files, messages };
  });

export { getUserInfoRoute };
