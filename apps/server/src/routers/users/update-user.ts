import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishUser } from '../../db/publishers';
import { users } from '../../db/schema';
import { protectedProcedure } from '../../utils/trpc';

const updateUserRoute = protectedProcedure
  .input(
    z.object({
      name: z.string().min(1).max(24),
      bannerColor: z
        .string()
        .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'),
      bio: z.string().max(160).optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    const updatedUser = await db
      .update(users)
      .set({
        name: input.name,
        bannerColor: input.bannerColor,
        bio: input.bio ?? null
      })
      .where(eq(users.id, ctx.userId))
      .returning()
      .get();

    await publishUser(updatedUser.id, 'update');
  });

export { updateUserRoute };
