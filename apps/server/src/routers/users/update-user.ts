import { isEmptyMessage } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishUser } from '../../db/publishers';
import { users } from '../../db/schema';
import { protectedProcedure } from '../../utils/trpc';
import { invariant } from '../../utils/invariant';

const updateUserRoute = protectedProcedure
  .input(
    z.object({
      name: z.string().min(1).max(24),
      bannerColor: z
        .string()
        .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color').optional(),
      bio: z.string().max(160).optional(),
      userId: z.number().optional()
    })
  )
  .mutation(async ({ ctx, input }) => {

    invariant(!isEmptyMessage(input.name), 'Invalid username');

    let userId = ctx.userId;
    let usernameChangeAllowed = true;
    if( input.userId ) {
      userId = input.userId;
    }
    else {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .get()
      
      usernameChangeAllowed = !user.lockedUsername;
    }

    const updateData: Partial<typeof users.$inferInsert> = {}

    if( usernameChangeAllowed ){
      updateData.name = input.name;
    }

    if( input.bannerColor ){
      updateData.bannerColor = input.bannerColor;
    }

    if( input.bio ){
      updateData.bio = input.bio;
    }

    const updatedUser = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning()
      .get();

    publishUser(updatedUser.id, 'update');
  });

export { updateUserRoute };
