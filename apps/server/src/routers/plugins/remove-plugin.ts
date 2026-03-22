import { Permission } from '@sharkord/shared';
import z from 'zod';
import { pluginManager } from '../../plugins';
import { protectedProcedure } from '../../utils/trpc';

const removeRoute = protectedProcedure
  .input(
    z.object({
      pluginId: z.string()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_PLUGINS);

    await pluginManager.removePlugin(input.pluginId);
  });

export { removeRoute };
