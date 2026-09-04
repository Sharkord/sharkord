import { getUrlFromServer } from './get-file-url';

const getPluginRouteUrl = (pluginId: string, path: string) => {
  const base = `${getUrlFromServer()}/plugins/${encodeURIComponent(pluginId)}`;

  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};

export { getPluginRouteUrl };
