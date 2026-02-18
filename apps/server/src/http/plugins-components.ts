import http from 'http';
import { getSettings } from '../db/queries/server';
import { pluginManager } from '../plugins';

// curl -v http://localhost:4991/plugin-ui

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

  const components = pluginManager.getComponents();

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(components));

  return res;
};

export { pluginsComponentsRouteHandler };
