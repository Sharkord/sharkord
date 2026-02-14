import { z } from 'zod';
import { getGiphyApiKey } from '../../utils/giphy-config';
import { protectedProcedure } from '../../utils/trpc';

const GIPHY_BASE = 'https://api.giphy.com/v1/gifs';

const fetchGiphy = async (url: string): Promise<unknown> => {
  const apiKey = getGiphyApiKey();
  if (!apiKey.trim()) {
    throw new Error(
      'Giphy API key not configured. Add it in Server Settings > General.'
    );
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      res.status === 429 ? 'Rate limit exceeded' : 'Giphy request failed'
    );
  }
  return res.json();
};

const giphySearchRoute = protectedProcedure
  .input(
    z.object({
      query: z.string(),
      limit: z.number().optional()
    })
  )
  .query(async ({ input }) => {
    const limit = input.limit ?? 25;
    const params = new URLSearchParams({
      api_key: getGiphyApiKey(),
      q: input.query.trim(),
      limit: String(limit),
      rating: 'g'
    });
    return fetchGiphy(`${GIPHY_BASE}/search?${params}`);
  });

const giphyTrendingRoute = protectedProcedure
  .input(z.object({ limit: z.number().optional() }))
  .query(async ({ input }) => {
    const limit = input.limit ?? 25;
    const params = new URLSearchParams({
      api_key: getGiphyApiKey(),
      limit: String(limit),
      rating: 'g'
    });
    return fetchGiphy(`${GIPHY_BASE}/trending?${params}`);
  });

export { giphySearchRoute, giphyTrendingRoute };
