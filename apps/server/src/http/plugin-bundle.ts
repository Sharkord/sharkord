import fs from 'fs';
import http from 'http';
import path from 'path';
import { getSettings } from '../db/queries/server';
import { PLUGINS_PATH } from '../helpers/paths';
import { logger } from '../logger';

// curl -v http://localhost:4991/plugin/ui-test-plugin/index.js

const pluginBundleRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const { enablePlugins } = await getSettings();

  if (!enablePlugins) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Plugins are disabled on this server' }));

    return;
  }

  if (!req.url) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad request' }));

    return;
  }

  let url: URL;

  try {
    url = new URL(req.url, `http://${req.headers.host}`);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad request' }));
    return;
  }

  let decodedPathname: string;

  try {
    decodedPathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid URL encoding' }));
    return;
  }

  const [, route, pluginId, ...filePathParts] = decodedPathname.split('/');

  if (route !== 'plugin-bundle') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  if (!pluginId || filePathParts.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({ error: 'Plugin ID and file path are required in the URL' })
    );
    return;
  }

  const requestedSubPath = filePathParts.join('/');
  const pluginPath = path.resolve(PLUGINS_PATH, pluginId);
  const requestedPath = path.resolve(pluginPath, requestedSubPath);

  if (!pluginPath.startsWith(path.resolve(PLUGINS_PATH))) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Forbidden' }));
    return;
  }

  if (!requestedPath.startsWith(pluginPath)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Forbidden' }));
    return;
  }

  const fileName = path.basename(requestedPath);

  if (!fs.existsSync(requestedPath)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'File not found on disk' }));
    return;
  }

  const stats = fs.statSync(requestedPath);

  if (stats.isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'File not found on disk' }));
    return;
  }

  const file = Bun.file(requestedPath);
  const fileStream = fs.createReadStream(requestedPath);

  res.writeHead(200, {
    'Content-Type': file.type || 'application/octet-stream',
    'Content-Length': file.size,
    'Content-Disposition': `attachment; filename="${fileName}"`
  });

  fileStream.pipe(res);

  fileStream.on('error', (err) => {
    logger.error('Error serving file:', err);

    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });

  res.on('close', () => {
    fileStream.destroy();
  });

  fileStream.on('end', () => {
    res.end();
  });

  return res;
};

export { pluginBundleRouteHandler };
