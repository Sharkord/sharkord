import {
  PLUGIN_STORAGE_KEY_MAX_LENGTH,
  PLUGIN_STORAGE_LIST_MAX_LIMIT,
  PLUGIN_STORAGE_VALUE_MAX_BYTES
} from '@sharkord/shared';
import {
  deletePluginStorageValue,
  setPluginStorageValue
} from '../../db/mutations/plugin-storage';
import {
  getPluginStorageValue,
  listPluginStorage
} from '../../db/queries/plugin-storage';
import { invariant } from '../../utils/invariant';

type TListPluginStorageInput = {
  prefix?: string;
  limit?: number;
  after?: string;
};

const DEFAULT_LIST_LIMIT = 100;

const assertValidKey = (key: string) => {
  invariant(
    typeof key === 'string' &&
      key.length > 0 &&
      key.length <= PLUGIN_STORAGE_KEY_MAX_LENGTH,
    {
      code: 'BAD_REQUEST',
      message: `Storage keys must be between 1 and ${PLUGIN_STORAGE_KEY_MAX_LENGTH} characters.`
    }
  );
};

const getPluginStorage = async (pluginId: string, key: string) => {
  assertValidKey(key);

  return getPluginStorageValue(pluginId, key);
};

const setPluginStorage = async (
  pluginId: string,
  key: string,
  value: unknown
) => {
  assertValidKey(key);

  const serialized = JSON.stringify(value);

  invariant(serialized !== undefined, {
    code: 'BAD_REQUEST',
    message: 'Storage values must be JSON. Use delete to remove a key.'
  });
  invariant(Buffer.byteLength(serialized) <= PLUGIN_STORAGE_VALUE_MAX_BYTES, {
    code: 'BAD_REQUEST',
    message: `A storage value cannot exceed ${PLUGIN_STORAGE_VALUE_MAX_BYTES} bytes.`
  });

  await setPluginStorageValue(pluginId, key, value);
};

const deletePluginStorage = async (pluginId: string, key: string) => {
  assertValidKey(key);

  await deletePluginStorageValue(pluginId, key);
};

const listPluginStorageEntries = async (
  pluginId: string,
  { prefix, limit = DEFAULT_LIST_LIMIT, after }: TListPluginStorageInput = {}
) => {
  invariant(
    Number.isInteger(limit) &&
      limit > 0 &&
      limit <= PLUGIN_STORAGE_LIST_MAX_LIMIT,
    {
      code: 'BAD_REQUEST',
      message: `The limit must be between 1 and ${PLUGIN_STORAGE_LIST_MAX_LIMIT}.`
    }
  );

  return listPluginStorage(pluginId, { prefix, limit, after });
};

export {
  deletePluginStorage,
  getPluginStorage,
  listPluginStorageEntries,
  setPluginStorage
};
