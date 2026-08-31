import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { StatePanel } from '@/components/server-screens/settings-shell/state-panel';
import { cn } from '@/lib/utils';
import type { TPluginInfo } from '@sharkord/shared';
import { Button, Input } from '@sharkord/ui';
import { AlertCircle, Package, RefreshCw, Search } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ListWithSeparators } from '../list-with-separators';
import { useMarketplaceData } from './hooks';
import { MarketplaceItem } from './marketplace-item';
import { MarketplaceSkeleton } from './marketplace-skeleton';

type TMarketplaceProps = {
  plugins: TPluginInfo[];
  refetchInstalled: () => Promise<void>;
};

const Marketplace = memo(({ plugins, refetchInstalled }: TMarketplaceProps) => {
  const installedPluginIds = useMemo(
    () => new Set(plugins.map((p) => p.id)),
    [plugins]
  );

  const installedPluginsById = useMemo(
    () => new Map(plugins.map((p) => [p.id, p.version])),
    [plugins]
  );
  const { t } = useTranslation('settings');
  const { filtered, loading, error, search, setSearch, isRefreshing, refresh } =
    useMarketplaceData(t);

  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value),
    [setSearch]
  );

  const renderContent = () => {
    if (loading) {
      return <MarketplaceSkeleton />;
    }

    if (error) {
      return (
        <StatePanel
          icon={AlertCircle}
          title={error}
          action={
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('marketplaceRetry')}
            </Button>
          }
        />
      );
    }

    return (
      <>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={handleSearchChange}
            placeholder={t('marketplaceSearchPlaceholder')}
            className="pl-9"
          />
        </div>
        {filtered.length === 0 ? (
          <StatePanel icon={Package} title={t('marketplaceNoResults')} />
        ) : (
          <ListWithSeparators
            items={filtered}
            getKey={(entry) => entry.plugin.id}
            renderItem={(entry) => (
              <MarketplaceItem
                entry={entry}
                isInstalled={installedPluginIds.has(entry.plugin.id)}
                installedVersion={installedPluginsById.get(entry.plugin.id)}
                refetchInstalled={refetchInstalled}
              />
            )}
          />
        )}
      </>
    );
  };

  return (
    <SettingsSection
      title={t('marketplaceTitle')}
      description={t('marketplaceDesc')}
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing || loading}
        >
          <RefreshCw
            className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
          />
          {t('refreshBtn')}
        </Button>
      }
    >
      {renderContent()}
    </SettingsSection>
  );
});

export { Marketplace };
