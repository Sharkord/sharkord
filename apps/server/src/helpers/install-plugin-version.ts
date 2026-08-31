import { getErrorMessage } from '@sharkord/shared';
import { logger } from '../logger';
import { pluginManager } from '../plugins';
import { downloadPlugin } from './downloads';
import { fetchMarketplaceVersion } from './marketplace';

const inFlight = new Map<string, Promise<unknown>>();

const swapPluginVersion = async (pluginId: string, version: string) => {
  const versionData = await fetchMarketplaceVersion(pluginId, version);
  const wasEnabled = pluginManager.isEnabled(pluginId);

  if (wasEnabled) {
    await pluginManager.unload(pluginId);
  }

  try {
    await downloadPlugin(
      pluginId,
      versionData.downloadUrl,
      versionData.checksum
    );
  } finally {
    if (wasEnabled) {
      // load() records its own failures against the plugin, but anything it
      // rethrows here would replace the error that actually stopped the install
      await pluginManager
        .load(pluginId)
        .catch((error) =>
          logger.error(
            'Failed to reload plugin %s after installing: %s',
            pluginId,
            getErrorMessage(error)
          )
        );
    }

    pluginManager.publishPlugins();
  }

  return versionData;
};

const installPluginVersion = async (pluginId: string, version: string) => {
  const previous = inFlight.get(pluginId) ?? Promise.resolve();

  const current = previous
    .catch(() => {})
    .then(() => swapPluginVersion(pluginId, version));

  inFlight.set(pluginId, current);

  try {
    return await current;
  } finally {
    if (inFlight.get(pluginId) === current) {
      inFlight.delete(pluginId);
    }
  }
};

export { installPluginVersion };
