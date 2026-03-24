import { Permission, zPluginId } from '@sharkord/shared';
import z from 'zod';
import { publishPlugins } from '../../db/publishers';
import { downloadPlugin } from '../../helpers/downloads';
import { fetchMarketplaceVersion } from '../../helpers/marketplace';
import { pluginManager } from '../../plugins';
import { protectedProcedure } from '../../utils/trpc';

const updateRoute = protectedProcedure
  .input(
    z.object({
      pluginId: zPluginId,
      version: z.string().min(1)
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_PLUGINS);

    const versionData = await fetchMarketplaceVersion(
      input.pluginId,
      input.version
    );

    const wasEnabled = pluginManager.isEnabled(input.pluginId);

    if (wasEnabled) {
      await pluginManager.togglePlugin(input.pluginId, false);
    }

    await downloadPlugin(versionData.downloadUrl, versionData.checksum);

    if (wasEnabled) {
      await pluginManager.togglePlugin(input.pluginId, true);
    }

    publishPlugins();
  });

export { updateRoute };
