import { getServerUrl } from './get-file-url';

const getPluginRouteUrl = (pluginId: string, path: string) => {
  const base = `${getServerUrl()}/plugins/${encodeURIComponent(pluginId)}`;

  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};

export { getPluginRouteUrl };
