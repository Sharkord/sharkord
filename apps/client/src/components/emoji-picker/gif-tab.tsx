import {
  getEmbedUrl,
  getTrendingGifs,
  searchGifs,
  type GiphyGif
} from '@/lib/giphy';
import { Input } from '@/components/ui/input';
import { debounce } from 'lodash-es';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

type TGifTabProps = {
  onGifSelect: (gifUrl: string) => void;
};

const DEBOUNCE_MS = 300;
const LIMIT = 25;

const GifTab = memo(({ onGifSelect }: TGifTabProps) => {
  const [search, setSearch] = useState('');
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGifs = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = query.trim()
        ? await searchGifs(query, LIMIT)
        : await getTrendingGifs(LIMIT);
      setGifs(res.data ?? []);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not load GIFs'
      );
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedFetch = useMemo(
    () => debounce(fetchGifs, DEBOUNCE_MS),
    [fetchGifs]
  );

  useEffect(() => {
    debouncedFetch(search);
    return () => debouncedFetch.cancel();
  }, [search, debouncedFetch]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    []
  );

  const handleGifClick = useCallback(
    (gif: GiphyGif) => {
      const url = getEmbedUrl(gif);
      onGifSelect(url);
    },
    [onGifSelect]
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
        <p className="text-sm">{error}</p>
        <p className="text-xs mt-2">
          Try again later or check your GIPHY API key.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <Input
          placeholder="Search GIFs..."
          value={search}
          onChange={handleSearchChange}
          className="h-9"
          autoFocus
        />
      </div>

      <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
        {search.trim() ? `Search results` : 'Trending'}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Loading...
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            No results
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 p-3">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                type="button"
                onClick={() => handleGifClick(gif)}
                className="aspect-square rounded-md overflow-hidden hover:ring-2 hover:ring-primary transition-colors cursor-pointer bg-muted"
              >
                <img
                  src={
                    gif.images.fixed_height_small?.url ??
                    gif.images.fixed_height?.url ??
                    gif.images.downsized?.url
                  }
                  alt={gif.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

GifTab.displayName = 'GifTab';

export { GifTab };
