import {
  ActivityLogType,
  Permission,
  PluginCapabilityType,
  zPluginId
} from '@sharkord/shared';
import z from 'zod';
import { publishCapabilityAccess } from '../../db/publishers';
import { deleteCapabilityAccess } from '../../db/queries/plugin-capabilities';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const resetCapabilityAccessRoute = protectedProcedure
  .input(
    z.object({
      pluginId: zPluginId,
      type: z.enum(PluginCapabilityType),
      name: z.string().min(1).max(100)
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_PLUGIN_PERMISSIONS);

    await deleteCapabilityAccess(input.pluginId, input.type, input.name);

    publishCapabilityAccess();

    enqueueActivityLog({
      type: ActivityLogType.PLUGIN_CAPABILITY_ACCESS_RESET,
      userId: ctx.user.id,
      details: {
        pluginId: input.pluginId,
        capability: `${input.type}:${input.name}`
      }
    });
  });

export { resetCapabilityAccessRoute };
