import { PLUGIN_USER_DATA_MAX_BYTES } from '@sharkord/shared';
import { and, eq } from 'drizzle-orm';
import { db } from '..';
import { invariant } from '../../utils/invariant';
import { pluginUserData } from '../schema';

const DEFAULT_DATA: Record<string, unknown> = {};

const getPluginUserData = async (
  pluginId: string,
  userId: number
): Promise<Record<string, unknown>> => {
  const row = await db
    .select({ data: pluginUserData.data })
    .from(pluginUserData)
    .where(
      and(
        eq(pluginUserData.pluginId, pluginId),
        eq(pluginUserData.userId, userId)
      )
    )
    .limit(1)
    .get();

  return row?.data ?? DEFAULT_DATA;
};

const setPluginUserData = async (
  pluginId: string,
  userId: number,
  data: Record<string, unknown>
) => {
  invariant(
    Buffer.byteLength(JSON.stringify(data)) <= PLUGIN_USER_DATA_MAX_BYTES,
    {
      code: 'BAD_REQUEST',
      message: `Plugin data for one user cannot exceed ${PLUGIN_USER_DATA_MAX_BYTES} bytes.`
    }
  );

  const now = Date.now();

  await db
    .insert(pluginUserData)
    .values({ pluginId, userId, data, updatedAt: now })
    .onConflictDoUpdate({
      target: [pluginUserData.pluginId, pluginUserData.userId],
      set: { data, updatedAt: now }
    });
};

const deletePluginUserData = async (pluginId: string, userId: number) => {
  await db
    .delete(pluginUserData)
    .where(
      and(
        eq(pluginUserData.pluginId, pluginId),
        eq(pluginUserData.userId, userId)
      )
    );
};

/** called when a plugin is removed. deleting a user cascades on its own */
const deleteAllPluginUserData = async (pluginId: string) => {
  await db.delete(pluginUserData).where(eq(pluginUserData.pluginId, pluginId));
};

export {
  deleteAllPluginUserData,
  deletePluginUserData,
  getPluginUserData,
  setPluginUserData
};
