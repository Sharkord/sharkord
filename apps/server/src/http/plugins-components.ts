import http from 'http';
import { getSettings } from '../db/queries/server';
import { pluginManager } from '../plugins';

const pluginsComponentsRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const { enablePlugins } = await getSettings();

  if (!enablePlugins) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Plugins are disabled on this server' }));

    return;
  }

  const pluginIds = pluginManager.getPluginIdsWithComponents();

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(pluginIds));

  return res;
};

export { pluginsComponentsRouteHandler };
