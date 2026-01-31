import fs from 'fs/promises';
import path from 'path';
import { pluginData, settings } from '../../db/schema';
import { PLUGINS_PATH } from '../../helpers/paths';
import { pluginManager } from '../../plugins';
import { tdb } from '../setup';

const loadMockedPlugins = async () => {
  // ensure plugins directory exists
  const mocksPath = path.join(__dirname, 'plugins');
  const plugins = await fs.readdir(mocksPath);

  // copy all mock plugins to the plugins directory used in tests
  for (const plugin of plugins) {
    const src = path.join(mocksPath, plugin);
    const dest = path.join(PLUGINS_PATH, plugin);

    await fs.cp(src, dest, { recursive: true });
  }
};

const resetPluginMocks = async () => {
  // enable plugins in settings
  await tdb.update(settings).set({ enablePlugins: true });

  // unload all plugins before each test
  await pluginManager.unloadPlugins();

  // reset plugin states - enable test plugins
  await tdb.delete(pluginData);

  await tdb.insert(pluginData).values([
    { pluginId: 'plugin-a', enabled: true },
    { pluginId: 'plugin-b', enabled: true },
    { pluginId: 'plugin-with-events', enabled: true },
    { pluginId: 'plugin-with-settings', enabled: true },
    { pluginId: 'plugin-no-unload', enabled: true },
    { pluginId: 'plugin-no-onload', enabled: true },
    { pluginId: 'plugin-throws-error', enabled: true }
  ]);

  // reload plugin states into memory
  await pluginManager.loadPlugins();
  await pluginManager.unloadPlugins();
};

export { loadMockedPlugins, resetPluginMocks };
