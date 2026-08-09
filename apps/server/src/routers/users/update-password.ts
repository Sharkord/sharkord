import { ActivityLogType, DisconnectCode } from '@sharkord/shared';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db';
import { users } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const updatePasswordRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.updatePassword.maxRequests,
  windowMs: config.rateLimiters.updatePassword.windowMs,
  logLabel: 'updatePassword'
})
  .input(
    z.object({
      currentPassword: z.string().min(4).max(128),
      newPassword: z.string().min(4).max(128),
      confirmNewPassword: z.string().min(4).max(128)
    })
  )
  .mutation(async ({ ctx, input }) => {
    const user = await db
      .select({
        password: users.password
      })
      .from(users)
      .where(eq(users.id, ctx.userId))
      .get();

    invariant(user, {
      code: 'NOT_FOUND',
      message: 'User not found'
    });

    const currentPasswordValid = await Bun.password.verify(
      input.currentPassword,
      user.password
    );

    if (!currentPasswordValid) {
      ctx.throwValidationError(
        'currentPassword',
        'Current password is incorrect'
      );
    }

    if (input.newPassword !== input.confirmNewPassword) {
      ctx.throwValidationError(
        'confirmNewPassword',
        'New password and confirmation do not match'
      );
    }

    if (input.newPassword === input.currentPassword) {
      ctx.throwValidationError(
        'newPassword',
        'New password must be different from the current one'
      );
    }

    const hashedNewPassword = await Bun.password.hash(input.newPassword);

    await db
      .update(users)
      .set({
        password: hashedNewPassword,
        tokenVersion: sql`${users.tokenVersion} + 1`
      })
      .where(eq(users.id, ctx.userId))
      .run();

    const ownWs = ctx.getOwnWs();

    ctx
      .getUserWs(ctx.userId)
      .filter((socket) => socket !== ownWs)
      .forEach((socket) =>
        socket.close(DisconnectCode.KICKED, 'Your password was changed')
      );

    enqueueActivityLog({
      type: ActivityLogType.USER_UPDATED_PASSWORD,
      userId: ctx.user.id
    });
  });

export { updatePasswordRoute };
