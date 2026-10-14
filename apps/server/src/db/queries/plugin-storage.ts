import { and, asc, eq, gt, gte, lt } from 'drizzle-orm';
import { db } from '..';
import { pluginStorage } from '../schema';

type TListPluginStorageOptions = {
  prefix?: string;
  limit: number;
  after?: string;
};

// sorts after every valid character, so it closes the range of a prefix
const PREFIX_RANGE_END = '\u{10FFFF}';

const getPluginStorageValue = async (
  pluginId: string,
  key: string
): Promise<unknown> => {
  const row = await db
    .select({ value: pluginStorage.value })
    .from(pluginStorage)
    .where(
      and(eq(pluginStorage.pluginId, pluginId), eq(pluginStorage.key, key))
    )
    .limit(1)
    .get();

  return row?.value;
};

const listPluginStorage = async (
  pluginId: string,
  { prefix, limit, after }: TListPluginStorageOptions
) =>
  db
    .select({ key: pluginStorage.key, value: pluginStorage.value })
    .from(pluginStorage)
    .where(
      and(
        eq(pluginStorage.pluginId, pluginId),
        prefix ? gte(pluginStorage.key, prefix) : undefined,
        prefix ? lt(pluginStorage.key, prefix + PREFIX_RANGE_END) : undefined,
        after !== undefined ? gt(pluginStorage.key, after) : undefined
      )
    )
    .orderBy(asc(pluginStorage.key))
    .limit(limit);

export { getPluginStorageValue, listPluginStorage };
export type { TListPluginStorageOptions };
