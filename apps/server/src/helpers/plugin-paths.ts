import {
  CLIENT_ENTRY_FILE,
  SERVER_ENTRY_FILE,
  zPluginId
} from '@sharkord/shared';
import path from 'path';
import { PLUGINS_DATA_PATH, PLUGINS_PATH } from './paths';

const parsePluginId = (pluginId: string) => {
  const parsed = zPluginId.safeParse(pluginId);

  if (!parsed.success) {
    throw new Error(`Invalid plugin ID: '${pluginId}'`);
  }

  return parsed.data;
};

const getPluginPath = (pluginId: string) =>
  path.join(PLUGINS_PATH, parsePluginId(pluginId));

const getPluginDataPath = (pluginId: string) =>
  path.join(PLUGINS_DATA_PATH, parsePluginId(pluginId));

const getPluginServerEntryPath = (pluginPath: string) =>
  path.join(pluginPath, SERVER_ENTRY_FILE);

const getPluginClientEntryPath = (pluginPath: string) =>
  path.join(pluginPath, CLIENT_ENTRY_FILE);

export {
  getPluginClientEntryPath,
  getPluginDataPath,
  getPluginPath,
  getPluginServerEntryPath
};
