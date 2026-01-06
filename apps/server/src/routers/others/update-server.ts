import { Permission } from '@sharkord/shared';
import { protectedProcedure } from '../../utils/trpc';
import { updater } from '../../utils/updater';

const updateServerRoute = protectedProcedure.mutation(async ({ ctx }) => {
  await ctx.needsPermission(Permission.MANAGE_UPDATES);

  await updater.update();
});

export { updateServerRoute };
