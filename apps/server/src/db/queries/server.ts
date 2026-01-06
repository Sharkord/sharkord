import type { TJoinedSettings } from '@sharkord/shared';
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

const getServerToken = async (): Promise<string> => {
  if (token) return token;

  const { secretToken } = await getSettings();

  if (!secretToken) {
    throw new Error('Secret token not found in database settings');
  }

  token = secretToken;

  return token;
};

export { getServerToken, getSettings };
