import { ActivityLogType, DisconnectCode, Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import z from 'zod';
import { db } from '../../db';
import { publishUser } from '../../db/publishers';
import { users } from '../../db/schema';
import { assertCanActOnUser } from '../../helpers/assert-can-act-on-user';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const banRoute = protectedProcedure
  .input(
    z.object({
      userId: z.number(),
      reason: z.string().optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_USERS);

    invariant(input.userId !== ctx.user.id, {
      code: 'BAD_REQUEST',
      message: 'You cannot ban yourself.'
    });

    const targetUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1)
      .get();

    invariant(targetUser, {
      code: 'NOT_FOUND',
      message: 'User not found.'
    });

    await assertCanActOnUser(ctx.userId, input.userId);

    ctx
      .getUserWs(input.userId)
      .forEach((socket) => socket.close(DisconnectCode.BANNED, input.reason));

    await db
      .update(users)
      .set({
        banned: true,
        banReason: input.reason ?? null,
        bannedAt: Date.now()
      })
      .where(eq(users.id, input.userId));

    publishUser(input.userId, 'update');

    enqueueActivityLog({
      type: ActivityLogType.USER_BANNED,
      userId: input.userId,
      details: {
        reason: input.reason,
        bannedBy: ctx.userId
      }
    });
  });

export { banRoute };
