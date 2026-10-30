import { DisconnectCode, OWNER_ROLE_ID } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db';
import { getUserRoleIds } from '../../db/queries/roles';
import { users } from '../../db/schema';
import { deleteUserAccount } from '../../helpers/delete-user-account';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const SOCKET_CLOSE_DELAY_MS = 1000;

// someone deleting their own account. an account with a password confirms with it, so a session
// left open on a shared computer cannot do it. one made through sso has none to ask for
const deleteOwnAccountRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.updatePassword.maxRequests,
  windowMs: config.rateLimiters.updatePassword.windowMs,
  logLabel: 'deleteOwnAccount'
})
  .input(
    z.object({
      password: z.string().max(128).optional(),
      wipe: z.boolean().default(false)
    })
  )
  .mutation(async ({ ctx, input }) => {
    const [user, roleIds] = await Promise.all([
      db
        .select({ password: users.password, passwordSet: users.passwordSet })
        .from(users)
        .where(eq(users.id, ctx.userId))
        .get(),
      getUserRoleIds(ctx.userId)
    ]);

    invariant(user, {
      code: 'NOT_FOUND',
      message: 'User not found'
    });

    // the server would be left with nobody able to run it
    invariant(!roleIds.includes(OWNER_ROLE_ID), {
      code: 'FORBIDDEN',
      message: "The server owner's account can't be deleted."
    });

    if (user.passwordSet) {
      const passwordValid =
        !!input.password &&
        (await Bun.password.verify(input.password, user.password));

      if (!passwordValid) {
        ctx.throwValidationError('password', 'Password is incorrect');
      }
    }

    await deleteUserAccount(ctx.userId, {
      wipe: input.wipe,
      deletedBy: ctx.userId
    });

    // closed once the reply has gone out, so the device that asked learns the delete worked
    // instead of only seeing its connection drop. the token stops working with the account
    const sockets = ctx.getUserWs(ctx.userId);

    setTimeout(() => {
      sockets.forEach((socket) =>
        socket.close(DisconnectCode.KICKED, 'Your account has been deleted')
      );
    }, SOCKET_CLOSE_DELAY_MS);
  });

export { deleteOwnAccountRoute };
