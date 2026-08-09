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
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const updateSettingsRoute = protectedProcedure
  .input(
    z.object({
      name: z.string().min(2).max(24).optional(),
      description: z.string().max(128).optional(),
      password: z.string().min(1).max(32).optional().nullable(),
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

    invariant(Object.keys(input).length > 0, {
      code: 'BAD_REQUEST',
      message: 'Nothing to update.'
    });

    const { enablePlugins: oldEnablePlugins } = await getSettings();

    await updateSettings(input);

    if (
      input.enablePlugins !== undefined &&
      input.enablePlugins !== oldEnablePlugins
    ) {
      if (input.enablePlugins) {
        await pluginManager.loadPlugins();
      } else {
        await pluginManager.unloadPlugins();
      }
    }

    publishSettings();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...loggedValues } = input;

    enqueueActivityLog({
      type: ActivityLogType.EDIT_SERVER_SETTINGS,
      userId: ctx.userId,
      details: { values: loggedValues }
    });
  });

export { updateSettingsRoute };
