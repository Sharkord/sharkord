import { ActivityLogType, getErrorMessage } from '@sharkord/shared';
import fs from 'fs/promises';
import { publishCapabilityAccess } from '../db/publishers';
import { logger } from '../logger';
import { pluginManager } from '../plugins';
import { enqueueActivityLog } from '../queues/activity-log';
import {
  copyPluginIntoPlace,
  createExtractDir,
  downloadPlugin,
  extractPluginArchive
} from './downloads';
import { fetchMarketplaceVersion } from './marketplace';
import { getPluginPath } from './plugin-paths';

const inFlight = new Map<string, Promise<unknown>>();

const swapPlugin = async (
  pluginId: string,
  writePlugin: () => Promise<void>
) => {
  const wasEnabled = pluginManager.isEnabled(pluginId);
  const wasInstalled = await fs.exists(getPluginPath(pluginId));

  if (wasEnabled) {
    await pluginManager.unload(pluginId);
  }

  pluginManager.markInstalling(pluginId);

  try {
    await writePlugin();
  } finally {
    pluginManager.clearInstalling(pluginId);

    if (wasEnabled) {
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

  return wasInstalled;
};

const installPlugin = async (
  pluginId: string,
  version: string,
  userId: number,
  writePlugin: () => Promise<void>
) => {
  const previous = inFlight.get(pluginId) ?? Promise.resolve();

  const current = previous
    .catch(() => {})
    .then(() => swapPlugin(pluginId, writePlugin));

  inFlight.set(pluginId, current);

  try {
    const wasInstalled = await current;

    enqueueActivityLog({
      type: wasInstalled
        ? ActivityLogType.PLUGIN_UPDATED
        : ActivityLogType.PLUGIN_INSTALLED,
      userId,
      details: { pluginId, version }
    });
  } finally {
    if (inFlight.get(pluginId) === current) {
      inFlight.delete(pluginId);
    }
  }
};

const installPluginVersion = async (
  pluginId: string,
  version: string,
  userId: number
) => {
  const versionData = await fetchMarketplaceVersion(pluginId, version);

  await installPlugin(pluginId, versionData.version, userId, () =>
    downloadPlugin(pluginId, versionData.downloadUrl, versionData.checksum)
  );

  return versionData;
};

const installPluginArchive = async (
  archiveBytes: Uint8Array,
  userId: number
) => {
  const extractPath = await createExtractDir();

  try {
    const { manifest, pluginPath } = await extractPluginArchive(
      archiveBytes,
      extractPath
    );

    await installPlugin(manifest.id, manifest.version, userId, () =>
      copyPluginIntoPlace(pluginPath, manifest.id)
    );

    logger.info(`Installed plugin '${manifest.id}' from an uploaded archive`);

    return manifest;
  } finally {
    await fs.rm(extractPath, { recursive: true, force: true });
  }
};

export { installPluginArchive, installPluginVersion };
