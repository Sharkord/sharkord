import { ActivityLogType, Permission, zPluginId } from '@sharkord/shared';
import z from 'zod';
import { pluginManager } from '../../plugins';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const removeRoute = protectedProcedure
  .input(
    z.object({
      pluginId: zPluginId
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_PLUGINS);

    await pluginManager.removePlugin(input.pluginId);

    pluginManager.publishPlugins();

    enqueueActivityLog({
      type: ActivityLogType.PLUGIN_REMOVED,
      userId: ctx.user.id,
      details: { pluginId: input.pluginId }
    });
  });

export { removeRoute };
