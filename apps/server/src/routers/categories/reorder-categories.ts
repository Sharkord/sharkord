import { ActivityLogType, Permission } from '@sharkord/shared';
import { asc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { reorderPositions } from '../../db/mutations/positions';
import { publishCategory } from '../../db/publishers';
import { categories } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const MAX_REORDERED_CATEGORIES = 500;

const reorderCategoriesRoute = protectedProcedure
  .input(
    z.object({
      categoryIds: z.array(z.number()).max(MAX_REORDERED_CATEGORIES)
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CATEGORIES);

    const existingCategories = await db
      .select({ id: categories.id })
      .from(categories)
      .orderBy(asc(categories.position), asc(categories.id));

    const nextCategoryOrder = await reorderPositions(
      categories,
      existingCategories.map((category) => category.id),
      input.categoryIds
    );

    nextCategoryOrder.forEach((categoryId) => {
      publishCategory(categoryId, 'update');
    });

    if (nextCategoryOrder.length > 0) {
      enqueueActivityLog({
        type: ActivityLogType.REORDERED_CATEGORIES,
        userId: ctx.user.id,
        details: {
          categoryIds: nextCategoryOrder
        }
      });
    }
  });

export { reorderCategoriesRoute };
