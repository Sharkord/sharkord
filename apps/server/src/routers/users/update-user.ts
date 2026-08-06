import {
  DELETED_USER_IDENTITY_AND_NAME,
  HEX_COLOR_REGEX
} from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishUser } from '../../db/publishers';
import { users } from '../../db/schema';
import { protectedProcedure } from '../../utils/trpc';

const updateUserRoute = protectedProcedure
  .input(
    z.object({
      name: z
        .string()
        .min(1)
        .max(24)
        .refine((val) => val !== DELETED_USER_IDENTITY_AND_NAME, {
          message: 'Protected username'
        }),
      profileColor: z.string().regex(HEX_COLOR_REGEX, 'Invalid hex color'),
      bio: z.string().max(160).optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    const updatedUser = await db
      .update(users)
      .set({
        name: input.name,
        profileColor: input.profileColor,
        bio: input.bio ?? null
      })
      .where(eq(users.id, ctx.userId))
      .returning()
      .get();

    publishUser(updatedUser.id, 'update');
  });

export { updateUserRoute };
