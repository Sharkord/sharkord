import { Permission } from '@sharkord/shared';
import z from 'zod';
import { pluginManager } from '../../plugins';
import { protectedProcedure } from '../../utils/trpc';

const getSettingsRoute = protectedProcedure
  .input(
    z.object({
      pluginId: z.string()
    })
  )
  .query(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_PLUGINS);

    return pluginManager.getPluginSettings(input.pluginId);
  });

export { getSettingsRoute };
