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
      userId: z.number()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_USERS);

    invariant(input.userId !== ctx.user.id, {
      code: 'BAD_REQUEST',
      message: 'You cannot delete yourself.'
    });

    const targetUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, input.userId))
      .get();

    invariant(targetUser, {
      code: 'NOT_FOUND',
      message: 'User not found.'
    });

    // Close the websocket connection if the user is connected
    const userWs = ctx.getUserWs(input.userId);

    if (userWs) {
      userWs.close(DisconnectCode.KICKED, 'Your account has been deleted');
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
        reason: 'Your account has been deleted',
        deletedBy: ctx.userId
      }
    });
  });

export { deleteUserRoute };
