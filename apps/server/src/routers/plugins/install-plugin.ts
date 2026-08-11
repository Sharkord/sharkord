import { ActivityLogType, Permission, zPluginId } from '@sharkord/shared';
import z from 'zod';
import { downloadPlugin } from '../../helpers/downloads';
import { fetchMarketplaceVersion } from '../../helpers/marketplace';
import { pluginManager } from '../../plugins';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const installRoute = protectedProcedure
  .input(
    z.object({
      pluginId: zPluginId,
      version: z.string().min(1)
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_PLUGINS);

    const versionData = await fetchMarketplaceVersion(
      input.pluginId,
      input.version
    );

    const wasEnabled = pluginManager.isEnabled(input.pluginId);

    if (wasEnabled) {
      await pluginManager.unload(input.pluginId);
    }

    try {
      await downloadPlugin(versionData.downloadUrl, versionData.checksum);
    } finally {
      // a failed download (network, checksum) would otherwise leave the plugin
      // unloaded in the process while still enabled in the database, dead until
      // the next restart
      if (wasEnabled) {
        await pluginManager.load(input.pluginId);
      }
    }

    enqueueActivityLog({
      type: ActivityLogType.PLUGIN_INSTALLED,
      userId: ctx.user.id,
      details: {
        pluginId: input.pluginId,
        version: versionData.version
      }
    });
  });

export { installRoute };
