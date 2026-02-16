import { ActivityLogType, Permission } from '@sharkord/shared';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishCategory } from '../../db/publishers';
import { categories } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const addCategoryRoute = protectedProcedure
  .input(
    z.object({
      name: z.string().min(1).max(32),
      categoryId: z.number().optional()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CATEGORIES);

    const [result] = await db
      .select({ maxPos: sql<number>`COALESCE(MAX(${categories.position}), 0)` })
      .from(categories);

    const targetPosition = (result?.maxPos ?? 0) + 1;

    const created = await db
      .insert(categories)
      .values({
        name: input.name,
        position: targetPosition,
        createdAt: Date.now(),
        categoryId: input.categoryId
      })
      .returning()
      .get();

    publishCategory(created.id, 'create');
    enqueueActivityLog({
      type: ActivityLogType.CREATED_CATEGORY,
      userId: ctx.user.id,
      details: {
        categoryName: input.name,
        categoryId: created.id
      }
    });

    return created.id;
  });

export { addCategoryRoute };
