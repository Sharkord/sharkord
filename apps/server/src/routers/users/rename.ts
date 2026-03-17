import { DELETED_USER_IDENTITY_AND_NAME, Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishUser } from '../../db/publishers';
import { users } from '../../db/schema';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';
import { usernameSchema } from './update-user';

const renameRoute = protectedProcedure
  .input(
    z.object({
      userId: z.number(),
      name: usernameSchema
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_USERS);

    const targetUser = await db
      .select({
        id: users.id,
        identity: users.identity,
        name: users.name
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
      message: 'Cannot rename the deleted user placeholder.'
    });

    if (targetUser.name === input.name) {
      return;
    }

    await db
      .update(users)
      .set({
        name: input.name
      })
      .where(eq(users.id, input.userId));

    publishUser(input.userId, 'update');
  });

export { renameRoute };
