import { eq } from 'drizzle-orm';
import http from 'http';
import path from 'path';
import { db } from '../db';
import { isFileOrphaned } from '../db/queries/files';
import { getSettings } from '../db/queries/server';
import { files } from '../db/schema';
import { verifyFileToken } from '../helpers/files-crypto';
import { PUBLIC_PATH } from '../helpers/paths';
import { logger } from '../logger';
import { buildCacheControl, sendFile, sendJsonError } from './helpers';

const INLINE_ALLOW_LIST = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
  'video/mp4',
  'audio/mpeg'
];

const publicRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  { url }: { url: URL }
) => {
  const fileName = decodeURIComponent(path.basename(url.pathname));

  const dbFile = await db
    .select({
      id: files.id,
      name: files.name,
      md5: files.md5,
      mimeType: files.mimeType,
      originalName: files.originalName
    })
    .from(files)
    .where(eq(files.name, fileName))
    .get();

  if (!dbFile) {
    sendJsonError(res, 404, 'File not found');
    return;
  }

  const isOrphaned = await isFileOrphaned(dbFile.id);

  if (isOrphaned) {
    sendJsonError(res, 404, 'File not found');
    return;
  }

  const { storageSignedUrlsEnabled, logoId } = await getSettings();
  const isSignedUrlProtected = storageSignedUrlsEnabled && dbFile.id !== logoId;
  let tokenExpiresAt: number | null = null;

  // server logo is the only exception to signed URLs
  if (isSignedUrlProtected) {
    const accessTokenParam = url.searchParams.get('accessToken');
    const expiresParam = url.searchParams.get('expires');

    if (!accessTokenParam || !expiresParam) {
      sendJsonError(res, 403, 'Forbidden');

      return;
    }

    const expiresAt = parseInt(expiresParam, 10);

    if (isNaN(expiresAt)) {
      sendJsonError(res, 403, 'Forbidden');

      return;
    }

    tokenExpiresAt = expiresAt;

    const isValidToken = verifyFileToken(
      dbFile.id,
      accessTokenParam,
      expiresAt
    );

    if (!isValidToken) {
      sendJsonError(res, 403, 'Forbidden');

      return;
    }
  }

  const filePath = path.join(PUBLIC_PATH, dbFile.name);

  const contentDisposition = INLINE_ALLOW_LIST.includes(dbFile.mimeType)
    ? 'inline'
    : 'attachment';

  const safeFileName = dbFile.originalName
    .replace(/[\r\n]/g, '') // strip CR/LF to prevent header injection
    .replace(/"/g, '\\"'); // escape double quotes for header safety

  const encodedFileName = encodeURIComponent(dbFile.originalName).replace(
    /'/g,
    '%27'
  );

  await sendFile(req, res, filePath, {
    cacheControl: buildCacheControl(isSignedUrlProtected, tokenExpiresAt),
    md5: dbFile.md5,
    contentType: dbFile.mimeType,
    contentDisposition: `${contentDisposition}; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`,
    notFoundMessage: 'File not found on disk',
    onNotFound: () =>
      logger.error(
        'File %s exists in database but not on disk (%s)',
        dbFile.name,
        filePath
      )
  });
};

export { publicRouteHandler };
