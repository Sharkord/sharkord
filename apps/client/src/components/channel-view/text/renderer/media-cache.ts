import { getFileUrl } from '@/helpers/get-file-url';
import {
  audioExtensions,
  imageExtensions,
  videoExtensions,
  type TJoinedMessage,
  type TMessageMetadata
} from '@sharkord/shared';
import { normalizeComparableUrl } from './helpers';
import type { TFoundMedia } from './types';

const ALLOWED_MEDIA_TYPES = ['image', 'video', 'audio'];
const MAX_CACHE_SIZE = 500;

const mediaCache = new Map<string, TFoundMedia[]>();

type TMessageMetadataLike = Partial<TMessageMetadata> & {
  kind?: TMessageMetadata['kind'];
  mediaType?: string;
  url?: string;
  title?: string;
};

const isMediaMetadata = (
  metadata: TMessageMetadataLike | null | undefined
): metadata is TMessageMetadataLike & {
  mediaType: 'image' | 'video' | 'audio';
  url: string;
} => {
  if (!metadata?.url) {
    return false;
  }

  if (metadata.kind === 'open_graph') {
    return false;
  }

  return (
    !!metadata.mediaType && ALLOWED_MEDIA_TYPES.includes(metadata.mediaType)
  );
};

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
        ? `${metadata.kind ?? 'legacy'}:${metadata.mediaType}:${metadata.url}:${metadata.title ?? ''}`
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
      const metadataEntry = metadata as TMessageMetadataLike | null | undefined;

      if (!isMediaMetadata(metadataEntry)) {
        return undefined;
      }

      return {
        key: getStableMediaKey(
          mediaKeyCounts,
          `metadata:${metadataEntry.mediaType}:${metadataEntry.url}`
        ),
        type: metadataEntry.mediaType,
        url: metadataEntry.url
      };
    })
    .filter((media) => !!media) as TFoundMedia[];

  trimMediaCache();

  const seenMedia = new Set<string>();

  const media = [...mediaFromFiles, ...mediaFromMetadata].filter((item) => {
    const mediaId = `${item.type}:${normalizeComparableUrl(item.url)}`;

    if (seenMedia.has(mediaId)) {
      return false;
    }

    seenMedia.add(mediaId);

    return true;
  });

  mediaCache.set(mediaSignature, media);

  return media;
};

export { buildMediaSignature, extractMessageMedia };
