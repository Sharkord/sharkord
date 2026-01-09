import type { TJoinedSettings, TPublicServerSettings } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { db } from '..';
import { files, settings } from '../schema';

// since this is static, we can keep it in memory to avoid querying the DB every time
let token: string;

const getSettings = async (): Promise<TJoinedSettings> => {
  const serverSettings = await db.select().from(settings).get()!;

  const logo = serverSettings.logoId
    ? await db
        .select()
        .from(files)
        .where(eq(files.id, serverSettings.logoId))
        .get()
    : undefined;

  return {
    ...serverSettings,
    logo: logo ?? null
  };
};

const getPublicSettings: () => Promise<TPublicServerSettings> = async () => {
  const settings = await getSettings();

  const publicSettings: TPublicServerSettings = {
    description: settings.description ?? '',
    name: settings.name,
    serverId: settings.serverId,
    storageUploadEnabled: settings.storageUploadEnabled,
    storageQuota: settings.storageQuota,
    storageUploadMaxFileSize: settings.storageUploadMaxFileSize,
    storageSpaceQuotaByUser: settings.storageSpaceQuotaByUser,
    storageOverflowAction: settings.storageOverflowAction,
    enablePlugins: settings.enablePlugins
  };

  return publicSettings;
};

const getServerTokenSync = (): string => {
  if (!token) {
    throw new Error('Server token has not been initialized yet');
  }

  return token;
};

const getServerToken = async (): Promise<string> => {
  if (token) return token;

  const { secretToken } = await getSettings();

  if (!secretToken) {
    throw new Error('Secret token not found in database settings');
  }

  token = secretToken;

  return token;
};

export { getPublicSettings, getServerToken, getServerTokenSync, getSettings };
