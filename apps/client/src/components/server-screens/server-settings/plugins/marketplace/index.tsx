import { StatePanel } from '@/components/server-screens/settings-shell/state-panel';
import { cn } from '@/lib/utils';
import type { TPluginInfo } from '@sharkord/shared';
import {
  Button,
  IconButton,
  Input,
  SettingsSection,
  Tooltip
} from '@sharkord/ui';
import {
  AlertCircle,
  ExternalLink,
  Package,
  RefreshCw,
  Search
} from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TMarketplaceData } from './hooks';
import { MarketplaceItem } from './marketplace-item';
import { MarketplaceSkeleton } from './marketplace-skeleton';

const PLUGINS_WEBSITE_URL = 'https://sharkord.com/plugins';

type TMarketplaceProps = {
  plugins: TPluginInfo[];
  marketplace: TMarketplaceData;
  refetchInstalled: () => Promise<void>;
};

const Marketplace = memo(
  ({ plugins, marketplace, refetchInstalled }: TMarketplaceProps) => {
    const installedPluginIds = useMemo(
      () => new Set(plugins.map((p) => p.id)),
      [plugins]
    );

    const installedPluginsById = useMemo(
      () => new Map(plugins.map((p) => [p.id, p.version])),
      [plugins]
    );
    const { t } = useTranslation('settings');
    const {
      filtered,
      loading,
      error,
      search,
      setSearch,
      isRefreshing,
      refresh
    } = marketplace;

    const handleRefresh = useCallback(async () => {
      await refresh();
    }, [refresh]);

    const handleOpenWebsite = useCallback(() => {
      window.open(PLUGINS_WEBSITE_URL, '_blank', 'noopener,noreferrer');
    }, []);

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
          <div className="relative">
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
            <div className="divide-y rounded-lg border">
              {filtered.map((entry) => (
                <MarketplaceItem
                  key={entry.plugin.id}
                  entry={entry}
                  isInstalled={installedPluginIds.has(entry.plugin.id)}
                  installedVersion={installedPluginsById.get(entry.plugin.id)}
                  refetchInstalled={refetchInstalled}
                />
              ))}
            </div>
          )}
        </>
      );
    };

    return (
      <SettingsSection
        title={t('marketplaceTitle')}
        description={t('marketplaceDesc')}
        action={
          <>
            <Tooltip content={t('marketplaceBrowseWebsite')}>
              <IconButton
                icon={ExternalLink}
                variant="ghost"
                size="sm"
                onClick={handleOpenWebsite}
                aria-label={t('marketplaceBrowseWebsite')}
              />
            </Tooltip>
            <Tooltip content={t('refreshBtn')}>
              <IconButton
                icon={RefreshCw}
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing || loading}
                aria-label={t('refreshBtn')}
                className={cn(isRefreshing && '[&_svg]:animate-spin')}
              />
            </Tooltip>
          </>
        }
      >
        {renderContent()}
      </SettingsSection>
    );
  }
);

export { Marketplace };
