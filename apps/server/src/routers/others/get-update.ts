import { Permission } from '@sharkord/shared';
import { SERVER_VERSION } from '../../utils/env';
import { protectedProcedure } from '../../utils/trpc';
import { updater } from '../../utils/updater';

const getLatestVersion = async () => {
  try {
    return await updater.getLatestVersion();
  } catch {
    return '0.0.0';
  }
};

const hasUpdates = async () => {
  try {
    return await updater.hasUpdates();
  } catch {
    return false;
  }
};

const getUpdateRoute = protectedProcedure.query(async ({ ctx }) => {
  await ctx.needsPermission(Permission.MANAGE_UPDATES);

  const [latestVersion, hasUpdate] = await Promise.all([
    getLatestVersion(),
    hasUpdates()
  ]);

  return {
    canUpdate: updater.canUpdate(),
    latestVersion,
    hasUpdate,
    currentVersion: SERVER_VERSION
  };
});

export { getUpdateRoute };
