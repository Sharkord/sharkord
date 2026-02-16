import { ActivityLogType, Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishCategory } from '../../db/publishers';
import { categories, channels } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const deleteCategoryRoute = protectedProcedure
  .input(
    z.object({
      categoryId: z.number()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CATEGORIES);

    const categoryToRemove = await db
      .select({categoryId: categories.id})
      .from(categories)
      .where(eq(categories.categoryId, input.categoryId));

    invariant(categoryToRemove.length === 0, 'Please delete contained Categories first');

    const removedCategory = await db
      .delete(categories)
      .where(eq(categories.id, input.categoryId))
      .returning()
      .get();

    invariant(removedCategory, 'Category not found');

    await db
      .delete(channels)
      .where(eq(channels.categoryId, removedCategory.id));

    publishCategory(removedCategory.id, 'delete');
    enqueueActivityLog({
      type: ActivityLogType.DELETED_CATEGORY,
      userId: ctx.user.id,
      details: {
        categoryId: removedCategory.id,
        categoryName: removedCategory.name
      }
    });
  });

export { deleteCategoryRoute };
