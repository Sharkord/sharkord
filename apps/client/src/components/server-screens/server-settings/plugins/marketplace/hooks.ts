import type { TMarketplaceEntry } from '@sharkord/shared';
import type { TFunction } from 'i18next';
import { useCallback, useEffect, useMemo, useState } from 'react';

const useMarketplaceData = (t: TFunction<'settings'>) => {
  const [entries, setEntries] = useState<TMarketplaceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMarketplace = useCallback(async () => {
    setError(null);

    try {
      // const response = await fetch(MARKETPLACE_INDEX_URL);
      // if (!response.ok) {
      //   throw new Error(`HTTP ${response.status}`);
      // }
      // const data = (await response.json()) as TMarketplaceEntry[];
      // setEntries(data);

      setEntries([
        {
          plugin: {
            id: 'plugin-example',
            name: 'Plugin Example',
            description: 'An example plugin to demonstrate the plugin system.',
            author: 'John Doe',
            repo: 'https://github.com/johndoe/plugin-example',
            logo: 'https://placehold.co/100x100/white/black',
            homepage: 'https://example.com/plugin-example',
            screenshots: [
              'https://placehold.co/600x400/111827/e5e7eb',
              'https://placehold.co/600x400/1f2937/f3f4f6'
            ],
            tags: ['test'],
            verified: true
          },
          versions: [
            {
              version: '0.0.1',
              downloadUrl:
                'https://files.diogomartino.run/public/plugin-example-0.0.1.tar.gz',
              checksum:
                'xyz123abc456def789ghi012jkl345mno678pqr901stu234vwx567yz890',
              sdkVersion: 1,
              size: 123456
            }
          ]
        }
      ]);
    } catch {
      setError(t('marketplaceFetchError'));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    fetchMarketplace();
  }, [fetchMarketplace]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchMarketplace();
  }, [fetchMarketplace]);

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;

    const query = search.toLowerCase().trim();

    return entries.filter((entry) => {
      const { plugin } = entry;

      return (
        plugin.name.toLowerCase().includes(query) ||
        plugin.description.toLowerCase().includes(query) ||
        plugin.author.toLowerCase().includes(query) ||
        plugin.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
        plugin.categories?.some((cat) => cat.toLowerCase().includes(query))
      );
    });
  }, [entries, search]);

  return {
    entries,
    filtered,
    loading,
    error,
    search,
    setSearch,
    isRefreshing,
    refresh
  };
};

export { useMarketplaceData };
