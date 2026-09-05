import { Permission } from '@sharkord/shared';
import { z } from 'zod';
import { updateCategory, zCategoryName } from '../../helpers/categories';
import { protectedProcedure } from '../../utils/trpc';

const updateCategoryRoute = protectedProcedure
  .input(
    z.object({
      categoryId: z.number().min(1),
      name: zCategoryName
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_CATEGORIES);

    await updateCategory(input.categoryId, input.name, ctx.user.id);
  });

export { updateCategoryRoute };
