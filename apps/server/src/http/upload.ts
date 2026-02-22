import { UploadHeaders } from '@sharkord/shared';
import fs from 'fs';
import http from 'http';
import path from 'path';
import z from 'zod';
import { getSettings } from '../db/queries/server';
import { getUserByToken } from '../db/queries/users';
import { logger } from '../logger';
import { fileManager } from '../utils/file-manager';

const zHeaders = z.object({
  [UploadHeaders.TOKEN]: z.string(),
  [UploadHeaders.ORIGINAL_NAME]: z.string(),
  [UploadHeaders.CONTENT_LENGTH]: z.string().transform((val) => Number(val))
});

/**
 * Sanitizes a user-provided filename to prevent path traversal attacks.
 * Strips directory components (both Unix and Windows style), rejects null bytes,
 * and ensures the result is a safe basename.
 */
const sanitizeFileName = (name: string): string | null => {
  // Reject null bytes which can truncate paths on some systems
  if (name.includes('\0')) {
    return null;
  }

  // Normalize Windows-style backslashes to forward slashes before extracting basename,
  // since path.basename on Linux does not treat backslashes as separators
  const normalized = name.replace(/\\/g, '/');

  // Strip any directory components (e.g. "../../etc/passwd" -> "passwd")
  const baseName = path.basename(normalized);

  // Reject empty names (e.g. after stripping path components from "/")
  if (!baseName || baseName === '.' || baseName === '..') {
    return null;
  }

  return baseName;
};

const uploadFileRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const parsedHeaders = zHeaders.parse(req.headers);

  const [token, rawOriginalName, contentLength] = [
    parsedHeaders[UploadHeaders.TOKEN],
    parsedHeaders[UploadHeaders.ORIGINAL_NAME],
    parsedHeaders[UploadHeaders.CONTENT_LENGTH]
  ];

  const originalName = sanitizeFileName(rawOriginalName);

  if (!originalName) {
    req.resume();
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid file name' }));
    return;
  }

  const user = await getUserByToken(token);

  if (!user) {
    req.resume();
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  const settings = await getSettings();

  if (contentLength > settings.storageUploadMaxFileSize) {
    req.resume();
    req.on('end', () => {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: `File ${originalName} exceeds the maximum allowed size`
        })
      );
    });

    return;
  }

  if (!settings.storageUploadEnabled) {
    req.resume();
    req.on('end', () => {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({ error: 'File uploads are disabled on this server' })
      );
    });

    return;
  }

  const safePath = await fileManager.getSafeUploadPath(originalName);
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

export { sanitizeFileName, uploadFileRouteHandler };
