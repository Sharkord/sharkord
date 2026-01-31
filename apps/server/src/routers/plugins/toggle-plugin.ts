import { ActivityLogType, Permission } from '@sharkord/shared';
import { z } from 'zod';
import { publishPluginCommands } from '../../db/publishers';
import { pluginManager } from '../../plugins';
import { enqueueActivityLog } from '../../queues/activity-log';
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

    publishPluginCommands();
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
