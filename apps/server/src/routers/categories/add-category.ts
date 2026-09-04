import { Permission } from '@sharkord/shared';
import { z } from 'zod';
import { createCategory, zCategoryName } from '../../helpers/categories';
import { protectedProcedure } from '../../utils/trpc';

const addCategoryRoute = protectedProcedure
  .input(z.object({ name: zCategoryName }))
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CATEGORIES);

    const category = await createCategory(input.name, ctx.user.id);

    return category.id;
  });

export { addCategoryRoute };
