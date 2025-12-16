import { Permission } from '@sharkord/shared';
import z from 'zod';
import { getFilesByUserId } from '../../db/queries/files/get-files-by-user-id';
import { getMessagesByUserId } from '../../db/queries/messages/get-messages-by-user-id';
import { getUserById } from '../../db/queries/users/get-user-by-id';
import { getLastLogins } from '../../db/queriesv2/logins';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const getUserInfoRoute = protectedProcedure
  .input(
    z.object({
      userId: z.number()
    })
  )
  .query(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_USERS);

    const user = await getUserById(input.userId);

    invariant(user, 'User not found');

    const [logins, files, messages] = await Promise.all([
      getLastLogins(user.id, 6),
      getFilesByUserId(user.id),
      getMessagesByUserId(user.id)
    ]);

    return { user, logins, files, messages };
  });

export { getUserInfoRoute };
