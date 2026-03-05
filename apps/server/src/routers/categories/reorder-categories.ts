import { ActivityLogType, Permission } from '@sharkord/shared';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishCategory } from '../../db/publishers';
import { categories } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

// TODO: all the reordering logic from categories and channels is BAD and will need to be redone, but for now this will do the trick

const reorderCategoriesRoute = protectedProcedure
  .input(
    z.object({
      categoryIds: z.array(z.number())
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CATEGORIES);

    const existingCategories = await db
      .select({ id: categories.id })
      .from(categories)
      .orderBy(asc(categories.position), asc(categories.id));

    const existingCategoryIds = existingCategories.map(
      (category) => category.id
    );

    const validIds = new Set(existingCategoryIds);
    const nextVisibleIds: number[] = [];

    for (const categoryId of input.categoryIds) {
      if (validIds.has(categoryId) && !nextVisibleIds.includes(categoryId)) {
        nextVisibleIds.push(categoryId);
      }
    }

    const missingCategoryIds = existingCategoryIds.filter(
      (categoryId) => !nextVisibleIds.includes(categoryId)
    );

    const nextCategoryOrder = [...nextVisibleIds, ...missingCategoryIds];

    await db.transaction(async (tx) => {
      for (let i = 0; i < nextCategoryOrder.length; i++) {
        const categoryId = nextCategoryOrder[i]!;
        const newPosition = i + 1;

        await tx
          .update(categories)
          .set({
            position: newPosition,
            updatedAt: Date.now()
          })
          .where(eq(categories.id, categoryId));
      }
    });

    nextCategoryOrder.forEach((categoryId) => {
      publishCategory(categoryId, 'update');
    });

    if (nextCategoryOrder.length > 0) {
      enqueueActivityLog({
        type: ActivityLogType.UPDATED_CATEGORY,
        userId: ctx.user.id,
        details: {
          categoryId: nextCategoryOrder[0]!,
          values: {
            position: nextCategoryOrder.length
          }
        }
      });
    }
  });

export { reorderCategoriesRoute };
