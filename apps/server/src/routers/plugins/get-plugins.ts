import { Permission, type TPluginInfo } from '@sharkord/shared';
import fs from 'node:fs/promises';
import { PLUGINS_PATH } from '../../helpers/paths';
import { pluginManager } from '../../plugins';
import { protectedProcedure } from '../../utils/trpc';

const getPluginsRoute = protectedProcedure.query(async ({ ctx }) => {
  await ctx.needsPermission(Permission.MANAGE_PLUGINS);

  const files = await fs.readdir(PLUGINS_PATH);

  const plugins: TPluginInfo[] = await Promise.all(
    files
      .map(async (file) => {
        try {
          const info = await pluginManager.getPluginInfo(file);

          return info;
        } catch {
          return undefined;
        }
      })
      .filter((plugin) => plugin !== undefined) as Promise<TPluginInfo>[]
  );

  return {
    plugins: plugins as TPluginInfo[]
  };
});

export { getPluginsRoute };
