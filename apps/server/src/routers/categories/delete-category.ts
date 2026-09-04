import { Permission } from '@sharkord/shared';
import { z } from 'zod';
import { deleteCategory } from '../../helpers/categories';
import { protectedProcedure } from '../../utils/trpc';

const deleteCategoryRoute = protectedProcedure
  .input(z.object({ categoryId: z.number() }))
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CATEGORIES);

    await deleteCategory(input.categoryId, ctx.user.id);
  });

export { deleteCategoryRoute };
