import { ActivityLogType, StorageOverflowAction } from '@sharkord/shared';
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
      allowNewUsers: z.boolean().optional(),
      storageUploadEnabled: z.boolean().optional(),
      storageUploadMaxFileSize: z.number().min(0).optional(),
      storageSpaceQuotaByUser: z.number().min(0).optional(),
      storageOverflowAction: z.enum(StorageOverflowAction).optional(),
      storageImageCompressionEnabled: z.boolean().optional(),
      storageImageCompressionMaxWidth: z.number().min(0).optional(),
      storageImageCompressionMaxHeight: z.number().min(0).optional(),
      storageVideoCompressionEnabled: z.boolean().optional(),
      storageVideoCompressionMaxWidth: z.number().min(0).optional(),
      storageVideoCompressionMaxHeight: z.number().min(0).optional(),
      enablePlugins: z.boolean().optional()
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { enablePlugins: oldEnablePlugins } = await getSettings();

    await updateSettings({
      name: input.name,
      description: input.description,
      password: input.password,
      allowNewUsers: input.allowNewUsers,
      storageUploadEnabled: input.storageUploadEnabled,
      storageUploadMaxFileSize: input.storageUploadMaxFileSize,
      storageSpaceQuotaByUser: input.storageSpaceQuotaByUser,
      storageOverflowAction: input.storageOverflowAction,
      storageImageCompressionEnabled: input.storageImageCompressionEnabled,
      storageImageCompressionMaxWidth: input.storageImageCompressionMaxWidth,
      storageImageCompressionMaxHeight: input.storageImageCompressionMaxHeight,
      storageVideoCompressionEnabled: input.storageVideoCompressionEnabled,
      storageVideoCompressionMaxWidth: input.storageVideoCompressionMaxWidth,
      storageVideoCompressionMaxHeight: input.storageVideoCompressionMaxHeight,
      enablePlugins: input.enablePlugins
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
