import { getErrorMessage } from '@sharkord/shared';
import dns from 'dns/promises';
import fs from 'fs/promises';
import { getSettings } from '../../db/queries/server';
import { logger } from '../../logger';
import { readBodyWithLimit } from '../../utils/read-body-with-limit';
import { changeUserImage } from '../change-user-image';
import { fileManager } from '../file-manager';
import { isPublicIp } from '../network';
import { oidcManager } from './manager';

const FETCH_TIMEOUT_MS = 5_000;

const EXTENSIONS_BY_MIME_TYPE: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif'
};

const assertFetchableAvatarUrl = async (url: URL) => {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`unsupported protocol "${url.protocol}"`);
  }

  if (url.origin === oidcManager.getIssuerUrl().origin) return;

  if (url.protocol !== 'https:') {
    throw new Error('a picture outside the provider origin must use https');
  }

  const addresses = await dns.lookup(url.hostname, { all: true });

  if (addresses.length === 0) {
    throw new Error(`"${url.hostname}" does not resolve`);
  }

  for (const { address } of addresses) {
    if (!isPublicIp(address)) {
      throw new Error(`"${url.hostname}" resolves to the private address`);
    }
  }
};

const downloadAvatar = async (url: URL, maxBytes: number) => {
  const response = await fetch(url, {
    redirect: 'error', // redirects should not be followed
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new Error(`picture request returned ${response.status}`);
  }

  const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim();
  const extension = mimeType ? EXTENSIONS_BY_MIME_TYPE[mimeType] : undefined;

  if (!extension) {
    throw new Error(`unsupported picture content type "${mimeType}"`);
  }

  const chunks: Uint8Array[] = [];

  await readBodyWithLimit(response, {
    maxBytes,
    tooLargeMessage: `picture is larger than the ${maxBytes} byte avatar limit`,
    onChunk: (chunk) => chunks.push(chunk)
  });

  return { bytes: Buffer.concat(chunks), extension };
};

const importOidcAvatar = async (userId: number, picture: string) => {
  try {
    const settings = await getSettings();

    if (!settings.storageUploadEnabled) return;

    const url = new URL(picture);

    await assertFetchableAvatarUrl(url);

    const { bytes, extension } = await downloadAvatar(
      url,
      settings.storageMaxAvatarSize
    );

    const originalName = `oidc-avatar-${userId}${extension}`;
    const uploadPath = await fileManager.getSafeUploadPath(originalName);

    await fs.writeFile(uploadPath, bytes);

    const tempFile = await fileManager.addTemporaryFile({
      originalName,
      filePath: uploadPath,
      size: bytes.length,
      userId
    });

    await changeUserImage(userId, 'avatar', tempFile.id);
  } catch (error) {
    logger.warn(
      'Could not import the OIDC avatar for user %d: %s',
      userId,
      getErrorMessage(error)
    );
  }
};

export { importOidcAvatar };
