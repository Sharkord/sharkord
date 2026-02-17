import fs from 'fs';
import http from 'http';
import path from 'path';
import { PLUGINS_PATH } from '../helpers/paths';
import { logger } from '../logger';

// curl -v http://localhost:4991/plugin/ui-test-plugin/index.js

const pluginBundleRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  if (!req.url) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad request' }));

    return;
  }

  const url = new URL(req.url!, `http://${req.headers.host}`);

  const fileName = decodeURIComponent(path.basename(url.pathname));
  const [, , pluginId] = url.pathname.split('/'); // /plugin/:pluginId/:fileName

  if (!pluginId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Plugin ID is required in the URL' }));
    return;
  }

  const filePath = path.join(PLUGINS_PATH, pluginId, fileName);

  console.log({ url, fileName, filePath, pluginId });

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'File not found on disk' }));
    return;
  }

  const file = Bun.file(filePath);
  const fileStream = fs.createReadStream(filePath);

  res.writeHead(200, {
    'Content-Type': file.type || 'application/octet-stream',
    'Content-Length': file.size,
    'Content-Disposition': `inline; filename="${fileName}"`
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
