import {
  DELETED_USER_IDENTITY_AND_NAME,
  DisconnectCode,
  Permission
} from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import z from 'zod';
import { db } from '../../db';
import { users } from '../../db/schema';
import { assertCanActOnUser } from '../../helpers/assert-can-act-on-user';
import { deleteUserAccount } from '../../helpers/delete-user-account';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const deleteUserRoute = protectedProcedure
  .input(
    z.object({
      userId: z.number(),
      wipe: z.boolean().default(false)
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_USERS);

    invariant(input.userId !== ctx.user.id, {
      code: 'BAD_REQUEST',
      message: 'You cannot delete yourself.'
    });

    const targetUser = await db
      .select({
        id: users.id,
        identity: users.identity,
        avatarId: users.avatarId,
        bannerId: users.bannerId
      })
      .from(users)
      .where(eq(users.id, input.userId))
      .get();

    invariant(targetUser, {
      code: 'NOT_FOUND',
      message: 'User not found.'
    });

    invariant(targetUser.identity !== DELETED_USER_IDENTITY_AND_NAME, {
      code: 'BAD_REQUEST',
      message: 'Cannot delete the deleted user placeholder.'
    });

    await assertCanActOnUser(ctx.userId, input.userId);

    ctx
      .getUserWs(input.userId)
      .forEach((socket) =>
        socket.close(DisconnectCode.KICKED, 'Your account has been deleted')
      );

    await deleteUserAccount(input.userId, {
      wipe: input.wipe,
      deletedBy: ctx.userId
    });
  });

export { deleteUserRoute };
