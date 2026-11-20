import {
  ActivityLogType,
  Permission,
  STORAGE_MAX_FILES_PER_MESSAGE,
  STORAGE_MAX_IMAGE_OPTIMIZATION_QUALITY,
  STORAGE_MAX_MEDIA_PROXY_CACHE_SECONDS,
  STORAGE_MAX_MEDIA_PROXY_MAX_REDIRECTS,
  STORAGE_MAX_MEDIA_PROXY_MAX_SIZE,
  STORAGE_MAX_MEDIA_PROXY_TIMEOUT_SECONDS,
  STORAGE_MIN_IMAGE_OPTIMIZATION_QUALITY,
  STORAGE_MIN_MEDIA_PROXY_CACHE_SECONDS,
  STORAGE_MIN_MEDIA_PROXY_MAX_REDIRECTS,
  STORAGE_MIN_MEDIA_PROXY_MAX_SIZE,
  STORAGE_MIN_MEDIA_PROXY_TIMEOUT_SECONDS,
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

const zStorageSettings = z.object({
  storageUploadEnabled: z.boolean().optional(),
  storageFileSharingInDirectMessages: z.boolean().optional(),
  storageQuota: z.number().min(0).optional(),
  storageUploadMaxFileSize: z.number().min(0).optional(),
  storageMaxAvatarSize: z.number().min(0).optional(),
  storageMaxBannerSize: z.number().min(0).optional(),
  storageMaxFilesPerMessage: z
    .number()
    .int()
    .min(0)
    .max(STORAGE_MAX_FILES_PER_MESSAGE)
    .optional(),
  storageSpaceQuotaByUser: z.number().min(0).optional(),
  storageOverflowAction: z.enum(StorageOverflowAction).optional(),
  storageSignedUrlsEnabled: z.boolean().optional(),
  storageSignedUrlsTtlSeconds: z.number().int().min(0).optional(),
  storageImageOptimizationEnabled: z.boolean().optional(),
  storageImageOptimizationQuality: z
    .number()
    .int()
    .min(STORAGE_MIN_IMAGE_OPTIMIZATION_QUALITY)
    .max(STORAGE_MAX_IMAGE_OPTIMIZATION_QUALITY)
    .optional(),
  storageMediaProxyEnabled: z.boolean().optional(),
  storageMediaProxyMaxSize: z
    .number()
    .int()
    .min(STORAGE_MIN_MEDIA_PROXY_MAX_SIZE)
    .max(STORAGE_MAX_MEDIA_PROXY_MAX_SIZE)
    .optional(),
  storageMediaProxyTimeoutSeconds: z
    .number()
    .int()
    .min(STORAGE_MIN_MEDIA_PROXY_TIMEOUT_SECONDS)
    .max(STORAGE_MAX_MEDIA_PROXY_TIMEOUT_SECONDS)
    .optional(),
  storageMediaProxyCacheSeconds: z
    .number()
    .int()
    .min(STORAGE_MIN_MEDIA_PROXY_CACHE_SECONDS)
    .max(STORAGE_MAX_MEDIA_PROXY_CACHE_SECONDS)
    .optional(),
  storageMediaProxyMaxRedirects: z
    .number()
    .int()
    .min(STORAGE_MIN_MEDIA_PROXY_MAX_REDIRECTS)
    .max(STORAGE_MAX_MEDIA_PROXY_MAX_REDIRECTS)
    .optional()
});

const zGeneralSettings = z.object({
  name: z.string().min(2).max(24).optional(),
  description: z.string().max(128).optional(),
  password: z.string().min(1).max(32).optional().nullable(),
  onlyAskForPasswordOnFirstJoin: z.boolean().optional(),
  allowNewUsers: z.boolean().optional(),
  directMessagesEnabled: z.boolean().optional(),
  enablePlugins: z.boolean().optional(),
  webRtcSimulcastEnabled: z.boolean().optional(),
  enableSearch: z.boolean().optional(),
  enableLinkPreviews: z.boolean().optional(),
  showWelcomeDialog: z.boolean().optional(),
  serverWizardCompleted: z.boolean().optional()
});

const STORAGE_SETTING_KEYS = Object.keys(zStorageSettings.shape);
const GENERAL_SETTING_KEYS = Object.keys(zGeneralSettings.shape);

const updateSettingsRoute = protectedProcedure
  .input(
    z.object({
      ...zGeneralSettings.shape,
      ...zStorageSettings.shape
    })
  )
  .mutation(async ({ input, ctx }) => {
    invariant(Object.keys(input).length > 0, {
      code: 'BAD_REQUEST',
      message: 'Nothing to update.'
    });

    const touchesStorage = STORAGE_SETTING_KEYS.some((key) => key in input);
    const touchesGeneral = GENERAL_SETTING_KEYS.some((key) => key in input);

    if (touchesStorage) {
      await ctx.needsPermission(Permission.MANAGE_STORAGE);
    }

    if (touchesGeneral) {
      await ctx.needsPermission(Permission.MANAGE_SETTINGS);
    }

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

      // connected clients would otherwise keep rendering slots and commands of
      // plugins that are no longer running
      pluginManager.publishPlugins();
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
