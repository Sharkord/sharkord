import {
  ActivityLogType,
  Permission,
  PluginCapabilityMode,
  PluginCapabilityType,
  zPluginId
} from '@sharkord/shared';
import z from 'zod';
import { publishCapabilityAccess } from '../../db/publishers';
import { setCapabilityAccess } from '../../db/queries/plugin-capabilities';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const setCapabilityAccessRoute = protectedProcedure
  .input(
    z.object({
      pluginId: zPluginId,
      type: z.enum(PluginCapabilityType),
      name: z.string().min(1).max(100),
      mode: z.enum(PluginCapabilityMode),
      roleIds: z.array(z.number()).max(100)
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_PLUGIN_PERMISSIONS);

    await setCapabilityAccess(
      input.pluginId,
      input.type,
      input.name,
      input.mode,
      input.roleIds
    );

    if (input.type === PluginCapabilityType.COMPONENT) {
      publishCapabilityAccess();
    }

    enqueueActivityLog({
      type: ActivityLogType.PLUGIN_CAPABILITY_ACCESS_UPDATED,
      userId: ctx.user.id,
      details: {
        pluginId: input.pluginId,
        capability: `${input.type}:${input.name}`,
        mode: input.mode
      }
    });
  });

export { setCapabilityAccessRoute };
