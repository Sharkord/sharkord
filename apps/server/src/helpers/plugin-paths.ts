import {
  CLIENT_ENTRY_FILE,
  SERVER_ENTRY_FILE,
  zPluginId
} from '@sharkord/shared';
import path from 'path';
import { PLUGINS_PATH } from './paths';

const getPluginPath = (pluginId: string) => {
  const parsed = zPluginId.safeParse(pluginId);

  if (!parsed.success) {
    throw new Error(`Invalid plugin ID: '${pluginId}'`);
  }

  return path.join(PLUGINS_PATH, parsed.data);
};

const getPluginServerEntryPath = (pluginPath: string) =>
  path.join(pluginPath, SERVER_ENTRY_FILE);

const getPluginClientEntryPath = (pluginPath: string) =>
  path.join(pluginPath, CLIENT_ENTRY_FILE);

export { getPluginClientEntryPath, getPluginPath, getPluginServerEntryPath };
