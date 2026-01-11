import { Permission, type TPluginInfo } from '@sharkord/shared';
import { pluginManager } from '../../plugins';
import { protectedProcedure } from '../../utils/trpc';

const getPluginsRoute = protectedProcedure.query(async ({ ctx }) => {
  await ctx.needsPermission(Permission.MANAGE_PLUGINS);

  const pluginIds = await pluginManager.getPluginsFromPath();

  const pluginResults = await Promise.all(
    pluginIds.map(async (pluginId) => {
      try {
        const info = await pluginManager.getPluginInfo(pluginId);

        return info;
      } catch {
        return undefined;
      }
    })
  );

  const plugins = pluginResults.filter(
    (plugin): plugin is TPluginInfo => !!plugin
  );

  return {
    plugins
  };
});

export { getPluginsRoute };
