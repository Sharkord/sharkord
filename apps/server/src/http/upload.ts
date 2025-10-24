import { UploadHeaders } from '@sharkord/shared';
import fs from 'fs';
import http from 'http';
import { getSettings } from '../db/queries/others/get-settings';
import { getUserByToken } from '../db/queries/users/get-user-by-token';
import { logger } from '../logger';
import { fileManager } from '../utils/file-manager';

const uploadFileRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const token = String(req.headers[UploadHeaders.TOKEN]);
  const originalName = String(req.headers[UploadHeaders.ORIGINAL_NAME]);
  const contentLength = Number(req.headers[UploadHeaders.CONTENT_LENGTH]);

  if (!token || !originalName || isNaN(contentLength)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing or invalid upload headers' }));
    return;
  }

  const user = await getUserByToken(token);

  if (!user) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  const settings = await getSettings();

  if (contentLength > settings.storageUploadMaxFileSize) {
    res.writeHead(413, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: `File ${originalName} exceeds the maximum allowed size`
      })
    );
    return;
  }

  if (!settings.storageUploadEnabled) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({ error: 'File uploads are disabled on this server' })
    );
    return;
  }

  const safePath = await fileManager.getSafeUploadPath(originalName);

  logger.debug(
    'Uploading file: %s (%d bytes) from %s',
    originalName,
    contentLength,
    user.name
  );

  const fileStream = fs.createWriteStream(safePath);

  req.pipe(fileStream);

  fileStream.on('finish', async () => {
    try {
      const tempFile = await fileManager.addTemporaryFile({
        originalName,
        filePath: safePath,
        size: contentLength,
        userId: user.id
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(tempFile));
    } catch (error) {
      logger.error('Error processing uploaded file:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File processing failed' }));
    }
  });

  fileStream.on('error', (err) => {
    logger.error('Error uploading file:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'File upload failed' }));
  });
};

export { uploadFileRouteHandler };
