import { and, eq } from 'drizzle-orm';
import { db } from '..';
import { pluginStorage } from '../schema';

const setPluginStorageValue = async (
  pluginId: string,
  key: string,
  value: unknown
) => {
  const now = Date.now();

  await db
    .insert(pluginStorage)
    .values({ pluginId, key, value, updatedAt: now })
    .onConflictDoUpdate({
      target: [pluginStorage.pluginId, pluginStorage.key],
      set: { value, updatedAt: now }
    });
};

const deletePluginStorageValue = async (pluginId: string, key: string) => {
  await db
    .delete(pluginStorage)
    .where(
      and(eq(pluginStorage.pluginId, pluginId), eq(pluginStorage.key, key))
    );
};

const deleteAllPluginStorage = async (pluginId: string) => {
  await db.delete(pluginStorage).where(eq(pluginStorage.pluginId, pluginId));
};

export {
  deleteAllPluginStorage,
  deletePluginStorageValue,
  setPluginStorageValue
};
