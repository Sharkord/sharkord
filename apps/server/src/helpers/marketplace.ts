import {
  MARKETPLACE_REGISTRY_URL,
  type TMarketplaceEntry,
  type TMarketplacePluginVersion
} from '@sharkord/shared';
import { invariant } from '../utils/invariant';

const fetchMarketplaceVersion = async (
  pluginId: string,
  version: string
): Promise<TMarketplacePluginVersion> => {
  const response = await fetch(MARKETPLACE_REGISTRY_URL);

  invariant(response.ok, 'Failed to fetch marketplace registry');

  const entries = (await response.json()) as TMarketplaceEntry[];
  const entry = entries.find((e) => e.plugin.id === pluginId);

  invariant(entry, `Plugin '${pluginId}' not found in marketplace`);

  const versionData = entry.versions.find((v) => v.version === version);

  invariant(
    versionData,
    `Version '${version}' not found for plugin '${pluginId}'`
  );

  return versionData;
};

export { fetchMarketplaceVersion };
