import { Permission } from '@sharkord/shared';
import { updater } from '../../helpers/updater';
import { protectedProcedure } from '../../utils/trpc';

const updateServerRoute = protectedProcedure.mutation(async ({ ctx }) => {
  await ctx.needsPermission(Permission.MANAGE_UPDATES);

  await updater.update();
});

export { updateServerRoute };
