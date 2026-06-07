import http from 'http';
import { getSettings } from '../db/queries/server';
import { pluginManager } from '../plugins';

const pluginsComponentsRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const { enablePlugins } = await getSettings();

  const pluginIds = enablePlugins
    ? pluginManager.getPluginIdsWithComponents()
    : [];

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(pluginIds));

  return res;
};

export { pluginsComponentsRouteHandler };
