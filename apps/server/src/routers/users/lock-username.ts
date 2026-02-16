import { ActivityLogType, Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import z from 'zod';
import { db } from '../../db';
import { publishUser } from '../../db/publishers';
import { users } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const lockUsernameRoute = protectedProcedure
  .input(
    z.object({
      userId: z.number(),
      isLocked: z.boolean()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_USERS);

    await db
      .update(users)
      .set({
        lockedUsername: input.isLocked
      })
      .where(eq(users.id, input.userId));

    publishUser(input.userId, 'update');

    enqueueActivityLog({
      type: ActivityLogType.USERNAME_LOCK,
      userId: input.userId,
      details: {
        lockBy: ctx.userId
      }
    });
  });

export { lockUsernameRoute };
