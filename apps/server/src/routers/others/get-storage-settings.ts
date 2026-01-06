import { Permission, type TStorageSettings } from '@sharkord/shared';
import { getSettings } from '../../db/queries/server';
import { getDiskMetrics } from '../../utils/metrics';
import { protectedProcedure } from '../../utils/trpc';

const getStorageSettingsRoute = protectedProcedure.query(async ({ ctx }) => {
  await ctx.needsPermission(Permission.MANAGE_STORAGE);

  const [settings, diskMetrics] = await Promise.all([
    getSettings(),
    getDiskMetrics()
  ]);

  const storageSettings: TStorageSettings = {
    storageUploadEnabled: settings.storageUploadEnabled,
    storageUploadMaxFileSize: settings.storageUploadMaxFileSize,
    storageSpaceQuotaByUser: settings.storageSpaceQuotaByUser,
    storageOverflowAction: settings.storageOverflowAction,
    storageQuota: settings.storageQuota
  };

  return { storageSettings, diskMetrics };
});

export { getStorageSettingsRoute };
