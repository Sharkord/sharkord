import { Permission, zPluginId } from '@sharkord/shared';
import z from 'zod';
import { pluginManager } from '../../plugins';
import { protectedProcedure } from '../../utils/trpc';

const getPluginLogsRoute = protectedProcedure
  .input(
    z.object({
      pluginId: zPluginId
    })
  )
  .query(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_PLUGINS);

    return pluginManager.getLogs(input.pluginId);
  });

export { getPluginLogsRoute };
