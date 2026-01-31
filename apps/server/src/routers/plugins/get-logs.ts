import { Permission } from '@sharkord/shared';
import z from 'zod';
import { pluginManager } from '../../plugins';
import { protectedProcedure } from '../../utils/trpc';

const getPluginLogsRoute = protectedProcedure
  .input(
    z.object({
      pluginId: z.string()
    })
  )
  .query(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_PLUGINS);

    const logs = await pluginManager.getLogs(input.pluginId);

    return logs;
  });

export { getPluginLogsRoute };
