import { ActivityLogType, DisconnectCode, Permission } from '@sharkord/shared';
import z from 'zod';
import { assertCanActOnUser } from '../../helpers/assert-can-act-on-user';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const kickRoute = protectedProcedure
  .input(
    z.object({
      userId: z.number(),
      reason: z.string().optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_USERS);

    await assertCanActOnUser(ctx.userId, input.userId);

    const userSockets = ctx.getUserWs(input.userId);

    invariant(userSockets.length > 0, {
      code: 'NOT_FOUND',
      message: 'User is not connected'
    });

    userSockets.forEach((socket) =>
      socket.close(DisconnectCode.KICKED, input.reason)
    );

    enqueueActivityLog({
      type: ActivityLogType.USER_KICKED,
      userId: input.userId,
      details: {
        reason: input.reason,
        kickedBy: ctx.userId
      }
    });
  });

export { kickRoute };
