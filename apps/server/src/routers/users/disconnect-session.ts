import { ActivityLogType, DisconnectCode, Permission } from '@sharkord/shared';
import z from 'zod';
import { assertCanActOnUser } from '../../helpers/assert-can-act-on-user';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const disconnectSessionRoute = protectedProcedure
  .input(
    z.object({
      userId: z.number(),
      sessionId: z.string().max(64),
      reason: z.string().max(256).optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_USERS);

    const sockets = ctx.getUserWs(input.userId);
    const socket = sockets.find(
      ({ session }) => session?.id === input.sessionId
    );

    invariant(socket, {
      code: 'NOT_FOUND',
      message: 'Session not found'
    });

    await assertCanActOnUser(ctx.userId, input.userId);

    socket.close(DisconnectCode.KICKED, input.reason);
    socket.session = undefined;

    enqueueActivityLog({
      type: ActivityLogType.USER_KICKED,
      userId: input.userId,
      details: {
        reason: input.reason,
        kickedBy: ctx.userId,
        sessionId: input.sessionId
      }
    });
  });

export { disconnectSessionRoute };
