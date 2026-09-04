import { Permission, type TStorageSettings } from '@sharkord/shared';
import { getStorageUsageByPlugin } from '../../db/queries/files';
import { getSettings } from '../../db/queries/server';
import { getDiskMetrics } from '../../utils/metrics';
import { protectedProcedure } from '../../utils/trpc';

const getStorageSettingsRoute = protectedProcedure.query(async ({ ctx }) => {
  await ctx.needsPermission(Permission.MANAGE_STORAGE);

  const [settings, diskMetrics, pluginStorage] = await Promise.all([
    getSettings(),
    getDiskMetrics(),
    getStorageUsageByPlugin()
  ]);

  const storageSettings: TStorageSettings = {
    storageUploadEnabled: settings.storageUploadEnabled,
    storageFileSharingInDirectMessages:
      settings.storageFileSharingInDirectMessages,
    storageQuota: settings.storageQuota,
    storageUploadMaxFileSize: settings.storageUploadMaxFileSize,
    storageMaxAvatarSize: settings.storageMaxAvatarSize,
    storageMaxBannerSize: settings.storageMaxBannerSize,
    storageMaxFilesPerMessage: settings.storageMaxFilesPerMessage,
    storageSpaceQuotaByUser: settings.storageSpaceQuotaByUser,
    storageOverflowAction: settings.storageOverflowAction,
    storageSignedUrlsEnabled: settings.storageSignedUrlsEnabled,
    storageSignedUrlsTtlSeconds: settings.storageSignedUrlsTtlSeconds,
    storageImageOptimizationEnabled: settings.storageImageOptimizationEnabled,
    storageImageOptimizationQuality: settings.storageImageOptimizationQuality
  };

  return { storageSettings, diskMetrics, pluginStorage };
});

export { getStorageSettingsRoute };
