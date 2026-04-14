import { getFileUrl } from '@/helpers/get-file-url';
import {
  audioExtensions,
  imageExtensions,
  videoExtensions,
  type TJoinedMessage
} from '@sharkord/shared';
import type { TFoundMedia } from './types';

const ALLOWED_MEDIA_TYPES = ['image', 'video', 'audio'];
const MAX_CACHE_SIZE = 500;

const mediaCache = new Map<string, TFoundMedia[]>();

const trimMediaCache = () => {
  if (mediaCache.size < MAX_CACHE_SIZE) {
    return;
  }

  const oldestKey = mediaCache.keys().next().value;

  if (oldestKey) {
    mediaCache.delete(oldestKey);
  }
};

const getStableMediaKey = (counts: Map<string, number>, baseKey: string) => {
  const nextCount = (counts.get(baseKey) ?? 0) + 1;

  counts.set(baseKey, nextCount);

  return nextCount === 1 ? baseKey : `${baseKey}-${nextCount}`;
};

const buildMediaSignature = (message: TJoinedMessage) => {
  const fileSignature = message.files
    .map(
      (file) => `${file.id}:${file.extension}:${file.size}:${file.updatedAt}`
    )
    .join('|');

  const metadataSignature = (message.metadata ?? [])
    .map((metadata) =>
      metadata
        ? `${metadata.mediaType}:${metadata.url}:${metadata.title ?? ''}`
        : 'null'
    )
    .join('|');

  return `${message.id}::${fileSignature}::${metadataSignature}`;
};

const extractMessageMedia = (message: TJoinedMessage): TFoundMedia[] => {
  const mediaSignature = buildMediaSignature(message);

  if (mediaCache.has(mediaSignature)) {
    return mediaCache.get(mediaSignature)!;
  }

  const mediaKeyCounts = new Map<string, number>();
  const mediaFromFiles: TFoundMedia[] = message.files
    .map((file) => {
      const extension = file.extension.toLowerCase();

      if (imageExtensions.includes(extension)) {
        return {
          key: getStableMediaKey(mediaKeyCounts, `file:${file.id}`),
          type: 'image',
          url: getFileUrl(file)
        };
      }

      if (videoExtensions.includes(extension)) {
        return {
          key: getStableMediaKey(mediaKeyCounts, `file:${file.id}`),
          type: 'video',
          url: getFileUrl(file)
        };
      }

      if (audioExtensions.includes(extension)) {
        return {
          key: getStableMediaKey(mediaKeyCounts, `file:${file.id}`),
          type: 'audio',
          url: getFileUrl(file)
        };
      }

      return undefined;
    })
    .filter((media) => !!media) as TFoundMedia[];

  const mediaFromMetadata: TFoundMedia[] = (message.metadata ?? [])
    .map((metadata) => {
      if (!metadata?.url) {
        return undefined;
      }

      if (!ALLOWED_MEDIA_TYPES.includes(metadata.mediaType)) {
        return undefined;
      }

      return {
        key: getStableMediaKey(
          mediaKeyCounts,
          `metadata:${metadata.mediaType}:${metadata.url}`
        ),
        type: metadata.mediaType,
        url: metadata.url
      };
    })
    .filter((media) => !!media) as TFoundMedia[];

  trimMediaCache();

  const media = [...mediaFromFiles, ...mediaFromMetadata];

  mediaCache.set(mediaSignature, media);

  return media;
};

export { buildMediaSignature, extractMessageMedia };
