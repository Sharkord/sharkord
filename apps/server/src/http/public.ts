import { eq } from 'drizzle-orm';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { db } from '../db';
import { isFileOrphaned } from '../db/queries/files';
import { getMessageByFileId } from '../db/queries/messages';
import { channels, files } from '../db/schema';
import { verifyFileToken } from '../helpers/files-crypto';
import { PUBLIC_PATH } from '../helpers/paths';
import { logger } from '../logger';

const pipeFileStream = (
  filePath: string,
  res: http.ServerResponse,
  streamOptions?: { start: number; end: number }
) => {
  const fileStream = fs.createReadStream(filePath, streamOptions);

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
};

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
  const fileName = decodeURIComponent(path.basename(url.pathname));

  const dbFile = await db
    .select()
    .from(files)
    .where(eq(files.name, fileName))
    .get();

  if (!dbFile) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'File not found' }));
    return;
  }

  const isOrphaned = await isFileOrphaned(dbFile.id);

  if (isOrphaned) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'File not found' }));
    return;
  }

  // it's gonna be defined if it's a message file
  // otherwise is something like an avatar or banner or something else
  // we can assume this because of the orphaned check above
  const associatedMessage = await getMessageByFileId(dbFile.id);

  if (associatedMessage) {
    const channel = await db
      .select()
      .from(channels)
      .where(eq(channels.id, associatedMessage.channelId))
      .get();

    if (channel && channel.private) {
      const accessToken = url.searchParams.get('accessToken');
      const isValidToken = verifyFileToken(
        dbFile.id,
        channel.fileAccessToken,
        accessToken || ''
      );

      if (!isValidToken) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden' }));
        return;
      }
    }
  }

  const filePath = path.join(PUBLIC_PATH, dbFile.name);

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'File not found on disk' }));
    return;
  }

  const stat = fs.statSync(filePath);

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

  const safeFileName = dbFile.originalName
    .replace(/[\r\n]/g, '') // strip CR/LF to prevent header injection
    .replace(/"/g, '\\"'); // escape double quotes for header safety

  const encodedFileName = encodeURIComponent(dbFile.originalName).replace(
    /'/g,
    '%27'
  );

  const dispositionHeader = `${contentDisposition}; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`;

  const rangeHeader = req.headers.range;

  if (rangeHeader) {
    const match = rangeHeader.match(/^bytes=(\d+)-(\d*)$/);

    if (!match) {
      res.writeHead(416, {
        'Content-Range': `bytes */${stat.size}`
      });
      res.end();
      return;
    }

    const start = parseInt(match[1]!, 10);
    const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;

    if (start >= stat.size || end >= stat.size || start > end) {
      res.writeHead(416, {
        'Content-Range': `bytes */${stat.size}`
      });
      res.end();
      return;
    }

    const contentLength = end - start + 1;

    res.writeHead(206, {
      'Content-Type': dbFile.mimeType,
      'Content-Length': contentLength,
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Disposition': dispositionHeader
    });

    pipeFileStream(filePath, res, { start, end });
  } else {
    res.writeHead(200, {
      'Content-Type': dbFile.mimeType,
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes',
      'Content-Disposition': dispositionHeader
    });

    pipeFileStream(filePath, res);
  }

  return res;
};

export { publicRouteHandler };
