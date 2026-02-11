import { ActivityLogType, DisconnectCode, Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import z from 'zod';
import { db } from '../../db';
import { publishUser } from '../../db/publishers';
import { users } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const deleteUserRoute = protectedProcedure
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
      message: 'You cannot delete yourself.'
    });

    // Close the websocket connection if the user is connected
    const userWs = ctx.getUserWs(input.userId);

    if (userWs) {
      userWs.close(DisconnectCode.KICKED, input.reason ?? 'User deleted');
    }

    // Delete the user from the database
    await db.delete(users).where(eq(users.id, input.userId));

    // Publish user deletion event
    publishUser(input.userId, 'delete');

    // Log the activity
    enqueueActivityLog({
      type: ActivityLogType.USER_DELETED,
      userId: input.userId,
      details: {
        reason: input.reason,
        deletedBy: ctx.userId
      }
    });
  });

export { deleteUserRoute };
