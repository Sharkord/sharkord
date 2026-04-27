import {
  audioExtensions,
  imageExtensions,
  removeCommandElements,
  removeEmojiElements,
  videoExtensions,
  type TGenericObject,
  type TMessageMediaMetadata,
  type TMessageOpenGraphMetadata
} from '@sharkord/shared';

// if it ends in a known media extension, we just assume it's a direct media link and skip the DNS resolution and metadata fetching
// there might be cases where this is not true, but it's a good heuristic to avoid unnecessary work
const getDirectMediaMetaFromUrl = (
  parsedUrl: URL
): {
  isDirectMediaLink: boolean;
  mediaType: 'image' | 'video' | 'audio' | 'none';
} => {
  try {
    const pathname = parsedUrl.pathname.toLowerCase();

    const isImage = imageExtensions.some((ext) => pathname.endsWith(ext));

    if (isImage) {
      return { isDirectMediaLink: true, mediaType: 'image' };
    }

    const isAudio = audioExtensions.some((ext) => pathname.endsWith(ext));

    if (isAudio) {
      return { isDirectMediaLink: true, mediaType: 'audio' };
    }

    const isVideo = videoExtensions.some((ext) => pathname.endsWith(ext));

    if (isVideo) {
      return { isDirectMediaLink: true, mediaType: 'video' };
    }
  } catch {
    // ignore
  }

  return { isDirectMediaLink: false, mediaType: 'none' };
};

const sanitizeContent = (content: string): string => {
  let cleanContent = content;

  // this will remove plugin commands AND emojis because they need to be ignored for metadata extraction
  cleanContent = removeCommandElements(cleanContent);
  cleanContent = removeEmojiElements(cleanContent);

  return cleanContent;
};

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeAbsoluteUrl = (
  baseUrl: string,
  value: unknown
): string | undefined => {
  const rawValue =
    typeof value === 'object' && value !== null && 'url' in value
      ? value.url
      : value;

  const candidate = normalizeOptionalString(rawValue);

  if (!candidate) {
    return undefined;
  }

  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return undefined;
  }
};

const normalizeUrlList = (
  baseUrl: string,
  value: unknown
): string[] | undefined => {
  const rawValues = Array.isArray(value) ? value : value ? [value] : [];
  const normalizedValues = Array.from(
    new Set(
      rawValues
        .map((item) => normalizeAbsoluteUrl(baseUrl, item))
        .filter((item) => !!item)
    )
  ) as string[];

  return normalizedValues.length > 0 ? normalizedValues : undefined;
};

const createDirectMediaMetadata = (
  url: string,
  parsedUrl: URL,
  mediaType: TMessageMediaMetadata['mediaType']
): TMessageMediaMetadata => {
  return {
    kind: 'media',
    url,
    title: parsedUrl.pathname.split('/').pop() || url,
    description: '',
    mediaType
  };
};

const createOpenGraphMetadata = (
  preview: TGenericObject,
  url: string
): TMessageOpenGraphMetadata | undefined => {
  const title =
    normalizeOptionalString(preview.title) ??
    normalizeOptionalString(preview.ogTitle);

  const siteName =
    normalizeOptionalString(preview.siteName) ??
    normalizeOptionalString(preview.ogSiteName);

  const description =
    normalizeOptionalString(preview.description) ??
    normalizeOptionalString(preview.ogDescription);

  const mediaType =
    normalizeOptionalString(preview.mediaType) ??
    normalizeOptionalString(preview.ogType) ??
    'website';

  const images = normalizeUrlList(url, preview.images ?? preview.ogImage);
  const videos = normalizeUrlList(url, preview.videos ?? preview.ogVideo);
  const favicons = normalizeUrlList(url, preview.favicons ?? preview.favicon);

  const hasRenderableContent =
    !!title ||
    !!siteName ||
    !!description ||
    !!images?.length ||
    !!favicons?.length;

  if (!hasRenderableContent) {
    return undefined;
  }

  return {
    kind: 'open_graph',
    url,
    title,
    siteName,
    description,
    mediaType,
    images,
    videos,
    favicons
  };
};

export {
  createDirectMediaMetadata,
  createOpenGraphMetadata,
  getDirectMediaMetaFromUrl,
  sanitizeContent
};
