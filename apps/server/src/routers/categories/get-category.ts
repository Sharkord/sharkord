import { Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { categories } from '../../db/schema';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const getCategoryRoute = protectedProcedure
  .input(
    z.object({
      categoryId: z.number().min(1)
    })
  )
  .query(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CATEGORIES);

    const category = await db
      .select()
      .from(categories)
      .where(eq(categories.id, input.categoryId))
      .limit(1)
      .get();

    invariant(category, {
      code: 'NOT_FOUND',
      message: 'Category not found'
    });

    return category;
  });

export { getCategoryRoute };
