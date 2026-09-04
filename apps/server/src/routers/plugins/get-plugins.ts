import { Permission } from '@sharkord/shared';
import { pluginManager } from '../../plugins';
import { protectedProcedure } from '../../utils/trpc';

const getPluginsRoute = protectedProcedure.query(async ({ ctx }) => {
  await ctx.needsPermission(Permission.MANAGE_PLUGINS);

  const pluginIds = await pluginManager.getPluginsFromPath();

  const plugins = await Promise.all(
    pluginIds.map((pluginId) =>
      pluginManager.getPluginInfoOrPlaceholder(pluginId)
    )
  );

  return { plugins };
});

export { getPluginsRoute };
