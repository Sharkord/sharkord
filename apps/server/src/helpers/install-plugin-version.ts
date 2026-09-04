import { ActivityLogType, getErrorMessage } from '@sharkord/shared';
import fs from 'fs/promises';
import { publishCapabilityAccess } from '../db/publishers';
import { logger } from '../logger';
import { pluginManager } from '../plugins';
import { enqueueActivityLog } from '../queues/activity-log';
import { downloadPlugin } from './downloads';
import { fetchMarketplaceVersion } from './marketplace';
import { getPluginPath } from './plugin-paths';

const inFlight = new Map<string, Promise<unknown>>();

const swapPluginVersion = async (pluginId: string, version: string) => {
  const versionData = await fetchMarketplaceVersion(pluginId, version);
  const wasEnabled = pluginManager.isEnabled(pluginId);
  const wasInstalled = await fs.exists(getPluginPath(pluginId));

  if (wasEnabled) {
    await pluginManager.unload(pluginId);
  }

  pluginManager.markInstalling(pluginId);

  try {
    await downloadPlugin(
      pluginId,
      versionData.downloadUrl,
      versionData.checksum
    );
  } finally {
    pluginManager.clearInstalling(pluginId);

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
    publishCapabilityAccess();
  }

  return { versionData, wasInstalled };
};

const installPluginVersion = async (
  pluginId: string,
  version: string,
  userId: number
) => {
  const previous = inFlight.get(pluginId) ?? Promise.resolve();

  const current = previous
    .catch(() => {})
    .then(() => swapPluginVersion(pluginId, version));

  inFlight.set(pluginId, current);

  try {
    const { versionData, wasInstalled } = await current;

    enqueueActivityLog({
      type: wasInstalled
        ? ActivityLogType.PLUGIN_UPDATED
        : ActivityLogType.PLUGIN_INSTALLED,
      userId,
      details: { pluginId, version: versionData.version }
    });

    return versionData;
  } finally {
    if (inFlight.get(pluginId) === current) {
      inFlight.delete(pluginId);
    }
  }
};

export { installPluginVersion };
