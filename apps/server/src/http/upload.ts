import { getErrorMessage, Permission, UploadHeaders } from '@sharkord/shared';
import fs from 'fs';
import http from 'http';
import z from 'zod';
import { config } from '../config';
import { userCan } from '../db/queries/roles';
import { getSettings } from '../db/queries/server';
import { getUserByToken } from '../db/queries/users';
import { fileManager } from '../helpers/file-manager';
import { getWsInfo } from '../helpers/get-ws-info';
import { logger } from '../logger';
import { createRateLimiter } from '../utils/rate-limiters/rate-limiter';
import {
  enforceHttpRateLimit,
  sanitizeFileName,
  sendJsonError
} from './helpers';

const zHeaders = z.object({
  [UploadHeaders.TOKEN]: z.string(),
  [UploadHeaders.ORIGINAL_NAME]: z.string(),
  [UploadHeaders.CONTENT_LENGTH]: z.coerce.number().int().nonnegative()
});

const uploadRateLimiter = createRateLimiter({
  maxRequests: config.rateLimiters.upload.maxRequests,
  windowMs: config.rateLimiters.upload.windowMs
});

const uploadFileRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const allowed = enforceHttpRateLimit(
    res,
    uploadRateLimiter,
    getWsInfo(undefined, req)?.ip,
    {
      route: '/upload',
      message: 'Too many uploads. Please try again shortly.'
    }
  );

  if (!allowed) {
    req.resume();

    return;
  }

  const parsedHeaders = zHeaders.parse(req.headers);

  const [token, rawOriginalName, contentLength] = [
    parsedHeaders[UploadHeaders.TOKEN],
    parsedHeaders[UploadHeaders.ORIGINAL_NAME],
    parsedHeaders[UploadHeaders.CONTENT_LENGTH]
  ];

  const originalName = sanitizeFileName(rawOriginalName);

  if (!originalName) {
    req.resume();
    sendJsonError(res, 400, 'Invalid file name');
    return;
  }

  const user = await getUserByToken(token);

  if (!user) {
    req.resume();
    sendJsonError(res, 401, 'Unauthorized');
    return;
  }

  if (!(await userCan(user.id, Permission.UPLOAD_FILES))) {
    req.resume();
    sendJsonError(res, 403, 'You do not have permission to upload files');
    return;
  }

  const settings = await getSettings();

  if (contentLength > settings.storageUploadMaxFileSize) {
    req.resume();
    req.on('end', () => {
      sendJsonError(
        res,
        413,
        `File ${originalName} exceeds the maximum allowed size`
      );
    });

    return;
  }

  if (!settings.storageUploadEnabled) {
    req.resume();
    req.on('end', () => {
      sendJsonError(res, 403, 'File uploads are disabled on this server');
    });

    return;
  }

  const safePath = await fileManager.getSafeUploadPath(originalName);
  const fileStream = fs.createWriteStream(safePath);

  req.pipe(fileStream);

  fileStream.on('finish', async () => {
    try {
      const { size } = await fs.promises.stat(safePath);

      if (size !== contentLength) {
        await fs.promises.rm(safePath, { force: true });
        sendJsonError(res, 400, 'Upload did not match the declared size');

        return;
      }

      const tempFile = await fileManager.addTemporaryFile({
        originalName,
        filePath: safePath,
        size,
        userId: user.id
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(tempFile));
    } catch (error) {
      logger.error(
        'Error processing uploaded file: %s',
        getErrorMessage(error)
      );
      sendJsonError(res, 500, 'File processing failed');
    }
  });

  fileStream.on('error', (err) => {
    logger.error('Error uploading file: %s', getErrorMessage(err));

    sendJsonError(res, 500, 'File upload failed');
  });
};

export { uploadFileRouteHandler };
