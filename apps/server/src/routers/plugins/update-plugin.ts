import { Permission, zPluginId } from '@sharkord/shared';
import z from 'zod';
import { publishPlugins } from '../../db/publishers';
import { downloadPlugin } from '../../helpers/downloads';
import { pluginManager } from '../../plugins';
import { protectedProcedure } from '../../utils/trpc';

const updateRoute = protectedProcedure
  .input(
    z.object({
      pluginId: zPluginId,
      url: z.url(),
      checksum: z.string().min(1)
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_PLUGINS);

    const wasEnabled = pluginManager.isEnabled(input.pluginId);

    if (wasEnabled) {
      await pluginManager.togglePlugin(input.pluginId, false);
    }

    await downloadPlugin(input.url, input.checksum);

    if (wasEnabled) {
      await pluginManager.togglePlugin(input.pluginId, true);
    }

    publishPlugins();
  });

export { updateRoute };
