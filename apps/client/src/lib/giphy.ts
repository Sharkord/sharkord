/**
 * GIPHY API client for GIF search and trending.
 * Replace YOUR_GIPHY_API_KEY with your key from https://developers.giphy.com/dashboard/
 * Optional: use VITE_GIPHY_API_KEY env var for production.
 */
const GIPHY_API_KEY =
  import.meta.env?.VITE_GIPHY_API_KEY ?? 'YOUR_GIPHY_API_KEY';
const GIPHY_BASE = 'https://api.giphy.com/v1/gifs';

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

export async function searchGifs(
  query: string,
  limit = 25
): Promise<GiphySearchResponse> {
  const params = new URLSearchParams({
    api_key: GIPHY_API_KEY,
    q: query.trim(),
    limit: String(limit),
    rating: 'g'
  });
  const res = await fetch(`${GIPHY_BASE}/search?${params}`);
  if (!res.ok) {
    throw new Error(res.status === 429 ? 'Rate limit exceeded' : 'Search failed');
  }
  return res.json();
}

/** Returns the animated GIF URL for embedding (ends in .gif for serializer compatibility). */
export function getEmbedUrl(gif: GiphyGif): string {
  const downsized = gif.images.downsized?.url;
  if (downsized && downsized.endsWith('.gif')) return downsized;
  const fixedHeight = gif.images.fixed_height?.url;
  if (fixedHeight && fixedHeight.endsWith('.gif')) return fixedHeight;
  const original = gif.images.original?.url;
  if (original && original.endsWith('.gif')) return original;
  return downsized ?? fixedHeight ?? original ?? gif.url;
}

export async function getTrendingGifs(
  limit = 25
): Promise<GiphySearchResponse> {
  const params = new URLSearchParams({
    api_key: GIPHY_API_KEY,
    limit: String(limit),
    rating: 'g'
  });
  const res = await fetch(`${GIPHY_BASE}/trending?${params}`);
  if (!res.ok) {
    throw new Error(res.status === 429 ? 'Rate limit exceeded' : 'Failed to load trending');
  }
  return res.json();
}
