import { ActivityLogType, Permission, zPluginId } from '@sharkord/shared';
import z from 'zod';
import { config } from '../../config';
import { installPluginVersion } from '../../helpers/install-plugin-version';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const updateRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.pluginInstall.maxRequests,
  windowMs: config.rateLimiters.pluginInstall.windowMs,
  logLabel: 'updatePlugin'
})
  .input(
    z.object({
      pluginId: zPluginId,
      version: z.string().min(1)
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_PLUGINS);

    const versionData = await installPluginVersion(
      input.pluginId,
      input.version
    );

    enqueueActivityLog({
      type: ActivityLogType.PLUGIN_UPDATED,
      userId: ctx.user.id,
      details: {
        pluginId: input.pluginId,
        version: versionData.version
      }
    });
  });

export { updateRoute };
