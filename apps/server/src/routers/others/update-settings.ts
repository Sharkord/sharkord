import {
  ActivityLogType,
  Permission,
  STORAGE_MAX_IMAGE_OPTIMIZATION_QUALITY,
  STORAGE_MIN_IMAGE_OPTIMIZATION_QUALITY,
  StorageOverflowAction
} from '@sharkord/shared';
import { z } from 'zod';
import { updateSettings } from '../../db/mutations/server';
import { publishSettings } from '../../db/publishers';
import { getSettings } from '../../db/queries/server';
import { pluginManager } from '../../plugins';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const updateSettingsRoute = protectedProcedure
  .input(
    z.object({
      name: z.string().min(2).max(24).optional(),
      description: z.string().max(128).optional(),
      password: z.string().min(1).max(32).optional().nullable().default(null),
      onlyAskForPasswordOnFirstJoin: z.boolean().optional(),
      allowNewUsers: z.boolean().optional(),
      directMessagesEnabled: z.boolean().optional(),
      storageUploadEnabled: z.boolean().optional(),
      storageFileSharingInDirectMessages: z.boolean().optional(),
      storageQuota: z.number().min(0).optional(),
      storageUploadMaxFileSize: z.number().min(0).optional(),
      storageMaxAvatarSize: z.number().min(0).optional(),
      storageMaxBannerSize: z.number().min(0).optional(),
      storageMaxFilesPerMessage: z.number().int().min(0).optional(),
      storageSpaceQuotaByUser: z.number().min(0).optional(),
      storageOverflowAction: z.enum(StorageOverflowAction).optional(),
      enablePlugins: z.boolean().optional(),
      webRtcSimulcastEnabled: z.boolean().optional(),
      enableSearch: z.boolean().optional(),
      showWelcomeDialog: z.boolean().optional(),
      storageSignedUrlsEnabled: z.boolean().optional(),
      storageSignedUrlsTtlSeconds: z.number().int().min(0).optional(),
      storageImageOptimizationEnabled: z.boolean().optional(),
      storageImageOptimizationQuality: z
        .number()
        .int()
        .min(STORAGE_MIN_IMAGE_OPTIMIZATION_QUALITY)
        .max(STORAGE_MAX_IMAGE_OPTIMIZATION_QUALITY)
        .optional()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_SETTINGS);

    const { enablePlugins: oldEnablePlugins } = await getSettings();

    await updateSettings({
      name: input.name,
      description: input.description,
      password: input.password,
      onlyAskForPasswordOnFirstJoin: input.onlyAskForPasswordOnFirstJoin,
      allowNewUsers: input.allowNewUsers,
      directMessagesEnabled: input.directMessagesEnabled,
      storageUploadEnabled: input.storageUploadEnabled,
      storageFileSharingInDirectMessages:
        input.storageFileSharingInDirectMessages,
      storageQuota: input.storageQuota,
      storageUploadMaxFileSize: input.storageUploadMaxFileSize,
      storageMaxAvatarSize: input.storageMaxAvatarSize,
      storageMaxBannerSize: input.storageMaxBannerSize,
      storageMaxFilesPerMessage: input.storageMaxFilesPerMessage,
      storageSpaceQuotaByUser: input.storageSpaceQuotaByUser,
      storageOverflowAction: input.storageOverflowAction,
      enablePlugins: input.enablePlugins,
      webRtcSimulcastEnabled: input.webRtcSimulcastEnabled,
      enableSearch: input.enableSearch,
      showWelcomeDialog: input.showWelcomeDialog,
      storageSignedUrlsEnabled: input.storageSignedUrlsEnabled,
      storageSignedUrlsTtlSeconds: input.storageSignedUrlsTtlSeconds,
      storageImageOptimizationEnabled: input.storageImageOptimizationEnabled,
      storageImageOptimizationQuality: input.storageImageOptimizationQuality
    });

    if (oldEnablePlugins !== input.enablePlugins) {
      if (input.enablePlugins) {
        await pluginManager.loadPlugins();
      } else {
        await pluginManager.unloadPlugins();
      }
    }

    publishSettings();

    enqueueActivityLog({
      type: ActivityLogType.EDIT_SERVER_SETTINGS,
      userId: ctx.userId,
      details: { values: input }
    });
  });

export { updateSettingsRoute };
