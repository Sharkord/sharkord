import { Permission } from '@sharkord/shared';
import { z } from 'zod';
import { pluginManager } from '../../plugins';
import { protectedProcedure } from '../../utils/trpc';

const togglePluginRoute = protectedProcedure
  .input(
    z.object({
      pluginId: z.string(),
      enabled: z.boolean()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_PLUGINS);

    await pluginManager.togglePlugin(input.pluginId, input.enabled);
  });

export { togglePluginRoute };
