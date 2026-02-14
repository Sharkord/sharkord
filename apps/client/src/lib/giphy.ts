export type GiphyImageRendition = {
  url: string;
  width: string;
  height: string;
  size?: string;
};

export type GiphyImages = {
  fixed_height_small: GiphyImageRendition;
  fixed_height: GiphyImageRendition;
  downsized: GiphyImageRendition;
  original: GiphyImageRendition;
  [key: string]: GiphyImageRendition | undefined;
};

export type GiphyGif = {
  id: string;
  title: string;
  images: GiphyImages;
  url: string;
};

export type GiphySearchResponse = {
  data: GiphyGif[];
  pagination: { offset: number; total_count?: number; count: number };
  meta: { msg: string; status: number };
};

/** Returns the animated GIF URL for embedding (ends in .gif for serializer compatibility). */
export function getEmbedUrl(gif: GiphyGif): string {
  const withoutQuery = (url: string) => url.split('?')[0];

  const candidates = [
    gif.images.downsized?.url,
    gif.images.fixed_height?.url,
    gif.images.original?.url
  ].filter((u): u is string => !!u);

  for (const url of candidates) {
    const base = withoutQuery(url);
    if (base.endsWith('.gif')) {
      return base;
    }
  }

  // Giphy serves the same asset in multiple formats at the same path; only the extension differs.
  // Transform known alternate formats (mp4, webp) to .gif. Reject unknown formats instead of blindly appending.
  const GIPHY_ALTERNATE_EXTENSIONS = /\.(mp4|webp)$/i;
  const fallback = candidates[0];
  if (fallback) {
    const base = withoutQuery(fallback);
    const transformed = base.replace(GIPHY_ALTERNATE_EXTENSIONS, '.gif');
    if (transformed !== base) {
      return transformed;
    }
    throw new Error(`No valid GIF URL found for embedding. Unsupported format: ${base}`);
  }

  throw new Error('No valid GIF image URL found');
}
