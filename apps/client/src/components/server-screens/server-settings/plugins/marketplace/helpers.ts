import {
  PLUGIN_SDK_VERSION,
  type TMarketplacePluginVersion
} from '@sharkord/shared';
import semver from 'semver';

export const isNewerVersion = (next: string, current: string) => {
  const nextVersion = semver.coerce(next);
  const currentVersion = semver.coerce(current);

  if (!nextVersion || !currentVersion) return false;

  return semver.gt(nextVersion, currentVersion);
};

export const getLatestCompatibleVersion = (
  versions: TMarketplacePluginVersion[]
) => {
  const compatible = versions.filter(
    (version) => version.sdkVersion === PLUGIN_SDK_VERSION
  );

  if (compatible.length === 0) return null;

  return compatible.reduce((best, next) =>
    isNewerVersion(next.version, best.version) ? next : best
  );
};
