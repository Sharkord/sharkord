import { Permission, zPluginId } from '@sharkord/shared';
import z from 'zod';
import { setPluginUserData } from '../../db/queries/plugin-user-data';
import { protectedProcedure } from '../../utils/trpc';

const setUserDataRoute = protectedProcedure
  .input(
    z.object({
      pluginId: zPluginId,
      data: z.record(z.string(), z.unknown())
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.USE_PLUGINS);

    await setPluginUserData(input.pluginId, ctx.user.id, input.data);
  });

export { setUserDataRoute };
