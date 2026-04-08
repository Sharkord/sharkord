import { Permission, zPluginId } from '@sharkord/shared';
import z from 'zod';
import { downloadPlugin } from '../../helpers/downloads';
import { fetchMarketplaceVersion } from '../../helpers/marketplace';
import { pluginManager } from '../../plugins';
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

    await downloadPlugin(versionData.downloadUrl, versionData.checksum);

    if (wasEnabled) {
      await pluginManager.load(input.pluginId);
    }
  });

export { installRoute };
