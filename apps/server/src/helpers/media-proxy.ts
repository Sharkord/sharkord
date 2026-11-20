import type { TMessageMetadata } from '@sharkord/shared';
import crypto from 'crypto';
import { getServerTokenSync } from '../db/queries/server';
import { safeCompare } from './safe-compare';

const MEDIA_PROXY_PATH = '/media-proxy';
const DIRECT_MEDIA_TYPES = ['image', 'video', 'audio'];

const signMediaUrl = (url: string): string => {
  const hmac = crypto.createHmac('sha256', getServerTokenSync());

  hmac.update(`media-proxy:${url}`);

  return hmac.digest('hex');
};

const verifyMediaUrl = (url: string, signature: string): boolean =>
  safeCompare(signMediaUrl(url), signature);

const buildMediaProxyUrl = (url: string): string => {
  const params = new URLSearchParams({ url, signature: signMediaUrl(url) });

  return `${MEDIA_PROXY_PATH}?${params.toString()}`;
};

const proxyMessageMetadata = (
  metadata: TMessageMetadata[] | null
): TMessageMetadata[] | null => {
  if (!metadata) return metadata;

  return metadata.map((entry) => {
    if (
      entry.kind === 'media' ||
      DIRECT_MEDIA_TYPES.includes(entry.mediaType)
    ) {
      return { ...entry, proxyUrl: buildMediaProxyUrl(entry.url) };
    }

    return {
      ...entry,
      images: entry.images?.map(buildMediaProxyUrl),
      favicons: entry.favicons?.map(buildMediaProxyUrl)
    };
  });
};

export {
  buildMediaProxyUrl,
  MEDIA_PROXY_PATH,
  proxyMessageMetadata,
  verifyMediaUrl
};
