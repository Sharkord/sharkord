import { Permission, zPluginId } from '@sharkord/shared';
import z from 'zod';
import { getPluginUserData } from '../../db/queries/plugin-user-data';
import { protectedProcedure } from '../../utils/trpc';

const getUserDataRoute = protectedProcedure
  .input(z.object({ pluginId: zPluginId }))
  .query(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.USE_PLUGINS);

    return getPluginUserData(input.pluginId, ctx.user.id);
  });

export { getUserDataRoute };
