import http from 'http';
import { logger } from '../logger';
import { fileManager } from '../utils/file-manager';
import type { TFile } from '@sharkord/shared';
import type { ReadStream } from 'fs';

const publicRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  if (!req.url) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad request' }));
    return;
  }

  const url = new URL(req.url!, `http://${req.headers.host}`);
  const urlPath = decodeURIComponent(url.pathname).split('/')
  const fileUUID = urlPath[2] || '';
  const fileName = urlPath[3] || '';
  const fileAccessToken = url.searchParams.get('accessToken')

  let dbFile: TFile;
  let fileStream: ReadStream;
  
  try {
    [dbFile, fileStream] = await fileManager.getFile(fileUUID, fileName, fileAccessToken);
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    let code = 400;
    let reason = 'Bad request'
    if (message === 'notFound') {
      code = 404;
      reason = 'File not found'
    } else if (message === 'forbidden') {
      code = 403;
      reason = 'Forbidden'
    }
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: reason }));
    return;
  }

  const inlineAllowlist = [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/avif',
    'video/mp4',
    'audio/mpeg'
  ];

  const contentDisposition = inlineAllowlist.includes(dbFile.mimeType)
    ? 'inline'
    : 'attachment';

  const headers: Record<string, string|number|undefined> = {
    'Content-Encoding': 'gzip',
    'Content-Type': dbFile.mimeType,
    'Content-Length': dbFile.size || 0,
    'Content-Disposition': `${contentDisposition}; filename*=UTF-8''${encodeURIComponent(dbFile.originalName)}"`
  }

  if (!dbFile.compressed) { // remove gzip header if not compressed
    delete headers['Content-Encoding']
  }

  res.writeHead(200, headers);

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

export { publicRouteHandler };
