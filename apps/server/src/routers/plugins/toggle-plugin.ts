import { ActivityLogType, Permission, zPluginId } from '@sharkord/shared';
import { z } from 'zod';
import { publishPlugins } from '../../db/publishers';
import { pluginManager } from '../../plugins';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const togglePluginRoute = protectedProcedure
  .input(
    z.object({
      pluginId: zPluginId,
      enabled: z.boolean()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_PLUGINS);

    await pluginManager.togglePlugin(input.pluginId, input.enabled);

    publishPlugins();

    enqueueActivityLog({
      type: ActivityLogType.PLUGIN_TOGGLED,
      userId: ctx.user.id,
      details: {
        pluginId: input.pluginId,
        enabled: input.enabled
      }
    });
  });

export { togglePluginRoute };
