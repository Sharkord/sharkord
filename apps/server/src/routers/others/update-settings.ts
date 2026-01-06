import { ActivityLogType, StorageOverflowAction } from '@sharkord/shared';
import { z } from 'zod';
import { updateSettings as updateSettingsMutation } from '../../db/mutations/server';
import { publishSettings } from '../../db/publishers';
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
      storageOverflowAction: z.enum(StorageOverflowAction).optional()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await updateSettingsMutation({
      name: input.name,
      description: input.description,
      password: input.password,
      allowNewUsers: input.allowNewUsers,
      storageUploadEnabled: input.storageUploadEnabled,
      storageUploadMaxFileSize: input.storageUploadMaxFileSize,
      storageSpaceQuotaByUser: input.storageSpaceQuotaByUser,
      storageOverflowAction: input.storageOverflowAction
    });

    await publishSettings();

    enqueueActivityLog({
      type: ActivityLogType.EDIT_SERVER_SETTINGS,
      userId: ctx.userId,
      details: { values: input }
    });
  });

export { updateSettingsRoute };
