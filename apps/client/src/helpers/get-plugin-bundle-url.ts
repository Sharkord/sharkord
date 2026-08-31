import { CLIENT_ENTRY_FILE } from '@sharkord/shared';
import { getUrlFromServer } from './get-file-url';

const getPluginBundleUrl = (pluginId: string, version: string | undefined) => {
  const url = `${getUrlFromServer()}/plugin-bundle/${pluginId}/${CLIENT_ENTRY_FILE}`;

  if (!version) return url;

  return `${url}?v=${encodeURIComponent(version)}`;
};

export { getPluginBundleUrl };
