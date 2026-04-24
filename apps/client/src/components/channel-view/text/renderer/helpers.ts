import type { TJoinedMessage } from '@sharkord/shared';
import type {
  TFoundMedia,
  TFoundOpenGraph,
  TMessageMetadataLike
} from './types';

const twitterRegex = /https:\/\/(twitter|x).com\/\w+\/status\/(\d+)/g;

const normalizeComparableUrl = (href: string): string => {
  try {
    const url = new URL(href);

    url.hash = '';

    return url.toString();
  } catch {
    return href;
  }
};

const getDisplayHostname = (href: string): string => {
  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return href;
  }
};

const getYoutubeVideoId = (url: URL) => {
  const hostname = url.hostname.replace(/^www\./, '');

  if (hostname === 'youtu.be') {
    return url.pathname.split('/').filter(Boolean)[0] ?? undefined;
  }

  if (!hostname.endsWith('youtube.com')) {
    return undefined;
  }

  const [firstSegment, secondSegment] = url.pathname.split('/').filter(Boolean);

  if (url.pathname === '/watch') {
    return url.searchParams.get('v') ?? undefined;
  }

  if (firstSegment && ['shorts', 'embed', 'v', 'live'].includes(firstSegment)) {
    return secondSegment ?? undefined;
  }

  return undefined;
};

const getTweetInfo = (
  href: string
): {
  isTweet: boolean;
  tweetId: string | undefined;
} => {
  try {
    const url = new URL(href);
    const isTweet =
      url.hostname.match(/(twitter|x).com/) && href.match(twitterRegex);

    const tweetId = isTweet
      ? href.match(twitterRegex)?.[0].split('/').pop()
      : undefined;

    return { isTweet: !!isTweet, tweetId };
  } catch {
    // ignore
  }

  return { isTweet: false, tweetId: undefined };
};

const getYoutubeInfo = (
  href: string
): {
  isYoutube: boolean;
  videoId: string | undefined;
} => {
  try {
    const url = new URL(href);
    const videoId = getYoutubeVideoId(url);

    return { isYoutube: !!videoId, videoId };
  } catch {
    // ignore
  }

  return { isYoutube: false, videoId: undefined };
};

const hasSpecializedLinkOverride = (href: string): boolean => {
  const { isTweet } = getTweetInfo(href);

  if (isTweet) {
    return true;
  }

  const { isYoutube } = getYoutubeInfo(href);

  return isYoutube;
};

const DIRECT_MEDIA_TYPES = new Set(['image', 'video', 'audio']);

const isMediaMetadata = (metadata: TMessageMetadataLike | null | undefined) => {
  return !!metadata?.mediaType && DIRECT_MEDIA_TYPES.has(metadata.mediaType);
};

const extractMessageOpenGraph = (
  message: TJoinedMessage,
  media: TFoundMedia[]
): TFoundOpenGraph[] => {
  const directMediaUrls = new Set(
    media.map((item) => normalizeComparableUrl(item.url))
  );
  const seenPreviewUrls = new Set<string>();

  return (message.metadata ?? [])
    .map((metadata, index) => {
      const metadataEntry = metadata as TMessageMetadataLike;

      if (
        !metadataEntry ||
        metadataEntry.kind === 'media' ||
        isMediaMetadata(metadataEntry)
      ) {
        return undefined;
      }

      if (!metadataEntry.url || hasSpecializedLinkOverride(metadataEntry.url)) {
        return undefined;
      }

      const normalizedUrl = normalizeComparableUrl(metadataEntry.url);

      if (seenPreviewUrls.has(normalizedUrl)) {
        return undefined;
      }

      seenPreviewUrls.add(normalizedUrl);

      const imageUrl = (metadataEntry.images ?? []).find((url) => {
        return !directMediaUrls.has(normalizeComparableUrl(url));
      });

      const preview: TFoundOpenGraph = {
        key: `open-graph:${normalizedUrl}:${index}`,
        url: metadataEntry.url,
        hostname: getDisplayHostname(metadataEntry.url),
        title: metadataEntry.title,
        siteName: metadataEntry.siteName,
        description: metadataEntry.description,
        imageUrl,
        faviconUrl: metadataEntry.favicons?.[0]
      };

      const hasRenderableContent =
        !!preview.title ||
        !!preview.siteName ||
        !!preview.description ||
        !!preview.imageUrl ||
        !!preview.faviconUrl;

      return hasRenderableContent ? preview : undefined;
    })
    .filter((item): item is TFoundOpenGraph => !!item);
};

export {
  extractMessageOpenGraph,
  getDisplayHostname,
  getTweetInfo,
  getYoutubeInfo,
  getYoutubeVideoId,
  hasSpecializedLinkOverride,
  normalizeComparableUrl
};
