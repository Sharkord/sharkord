import { cn } from '@/lib/utils';
import type { TPluginInfo } from '@sharkord/shared';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Separator
} from '@sharkord/ui';
import { AlertCircle, Package, RefreshCw, Search } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMarketplaceData } from './hooks';
import { MarketplaceItem } from './marketplace-item';
import { MarketplaceSkeleton } from './marketplace-skeleton';

type TMarketplaceProps = {
  plugins: TPluginInfo[];
};

const Marketplace = memo(({ plugins }: TMarketplaceProps) => {
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

  const renderContent = () => {
    if (loading) {
      return <MarketplaceSkeleton />;
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-1">{error}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="mt-4"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('marketplaceRetry')}
          </Button>
        </div>
      );
    }

    return (
      <>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('marketplaceSearchPlaceholder')}
            className="pl-9"
          />
        </div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">
              {t('marketplaceNoResults')}
            </h3>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((entry, index) => (
              <div key={entry.plugin.id}>
                <MarketplaceItem
                  entry={entry}
                  isInstalled={installedPluginIds.has(entry.plugin.id)}
                  installedVersion={installedPluginsById.get(entry.plugin.id)}
                />
                {index < filtered.length - 1 && <Separator className="mt-3" />}
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('marketplaceTitle')}</CardTitle>
            <CardDescription>{t('marketplaceDesc')}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            className="shrink-0"
          >
            <RefreshCw
              className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')}
            />
            {t('refreshBtn')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
});

export { Marketplace };
