import { Dialog } from '@/components/dialogs/dialogs';
import { openDialog } from '@/features/dialogs/actions';
import { useDateLocale } from '@/hooks/use-date-locale';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  getTrpcError,
  PLUGIN_SDK_VERSION,
  type TMarketplaceEntry
} from '@sharkord/shared';
import { Badge, Button, Tooltip } from '@sharkord/ui';
import { format } from 'date-fns';
import { BadgeCheck, Calendar, Download, Package, User } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import semver from 'semver';
import { toast } from 'sonner';
import { ImageWithFallback } from './image-with-fallback';
import { MarketplaceScreenshots } from './marketplace-screenshots';

type TMarketplaceItemProps = {
  entry: TMarketplaceEntry;
  isInstalled: boolean;
  installedVersion?: string;
  refetchInstalled: () => Promise<void>;
};

const MarketplaceItem = memo(
  ({
    entry,
    isInstalled,
    installedVersion,
    refetchInstalled
  }: TMarketplaceItemProps) => {
    const { t } = useTranslation('settings');
    const dateLocale = useDateLocale();
    const [installingId, setInstallingId] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const { plugin, versions } = entry;
    const latestVersion = versions[0];

    const isNewerVersion = useCallback((next: string, current: string) => {
      const nextVersion = semver.coerce(next);
      const currentVersion = semver.coerce(current);

      if (!nextVersion || !currentVersion) return false;

      return semver.gt(nextVersion, currentVersion);
    }, []);

    const latestCompatibleVersion = useMemo(() => {
      const compatible = versions.filter((version) => {
        return version.sdkVersion === PLUGIN_SDK_VERSION;
      });

      if (compatible.length === 0) return null;

      return compatible.reduce((best, next) =>
        isNewerVersion(next.version, best.version) ? next : best
      );
    }, [versions, isNewerVersion]);

    const sdkVersion =
      latestCompatibleVersion?.sdkVersion ?? latestVersion?.sdkVersion;

    const sdkCompatible = sdkVersion === PLUGIN_SDK_VERSION;

    const updateAvailable = useMemo(() => {
      if (!installedVersion || !latestCompatibleVersion) return false;

      return isNewerVersion(latestCompatibleVersion.version, installedVersion);
    }, [installedVersion, latestCompatibleVersion, isNewerVersion]);

    const releaseDate = useMemo(() => {
      return {
        short: format(latestVersion.timestamp ?? 0, 'PPP', {
          locale: dateLocale
        }),
        full: format(latestVersion.timestamp ?? 0, 'PPP p', {
          locale: dateLocale
        })
      };
    }, [dateLocale, latestVersion?.timestamp]);

    const performInstall = useCallback(async () => {
      if (!latestVersion) return;

      const trpc = getTRPCClient();

      try {
        setInstallingId(plugin.id);

        await trpc.plugins.install.mutate({
          pluginId: plugin.id,
          version: latestVersion.version
        });

        toast.success(t('marketplaceInstallSuccess', { name: plugin.name }));

        await refetchInstalled();
      } catch (error) {
        toast.error(getTrpcError(error, t('marketplaceInstallError')));
      } finally {
        setInstallingId(null);
      }
    }, [plugin.id, latestVersion, t, plugin.name, refetchInstalled]);

    const performUpdate = useCallback(async () => {
      if (!latestCompatibleVersion) return;

      const trpc = getTRPCClient();

      try {
        setUpdatingId(plugin.id);

        await trpc.plugins.update.mutate({
          pluginId: plugin.id,
          version: latestCompatibleVersion.version
        });

        await refetchInstalled();
      } catch (error) {
        toast.error(getTrpcError(error, t('marketplaceUpdateError')));
      } finally {
        setUpdatingId(null);
      }
    }, [latestCompatibleVersion, plugin.id, t, refetchInstalled]);

    const onInstallClick = useCallback(() => {
      openDialog(Dialog.PLUGIN_INSTALL_CONFIRM, {
        pluginName: plugin.name,
        onConfirm: performInstall
      });
    }, [plugin.name, performInstall]);

    const onUpdateClick = useCallback(() => {
      openDialog(Dialog.PLUGIN_INSTALL_CONFIRM, {
        pluginName: plugin.name,
        onConfirm: performUpdate
      });
    }, [plugin.name, performUpdate]);

    return (
      <div className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        <div className="shrink-0">
          {plugin.logo ? (
            <ImageWithFallback
              src={plugin.logo}
              alt={`${plugin.name} logo`}
              className="w-12 h-12 rounded-md object-cover"
              iconFallback={
                <Package className="w-6 h-6 text-muted-foreground" />
              }
            />
          ) : null}
          <div
            className={cn(
              'w-12 h-12 rounded-md bg-muted flex items-center justify-center',
              plugin.logo && 'hidden'
            )}
          >
            <Package className="w-6 h-6 text-muted-foreground" />
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base leading-tight">
                  {plugin.name}
                </h3>
                {plugin.verified && (
                  <Tooltip content={t('marketplaceVerifiedTooltip')}>
                    <Badge variant="default" className="gap-1 text-xs shrink-0">
                      <BadgeCheck className="w-3 h-3" />
                      {t('marketplaceVerified')}
                    </Badge>
                  </Tooltip>
                )}
                <Badge
                  variant={sdkCompatible ? 'secondary' : 'destructive'}
                  className="text-xs shrink-0"
                >
                  {sdkCompatible
                    ? t('marketplaceSdkCompatible')
                    : t('marketplaceSdkIncompatible')}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {plugin.description}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isInstalled && (
                <Badge variant="secondary">
                  {t('marketplaceInstalledBadge')}
                </Badge>
              )}
              {updateAvailable ? (
                <Button
                  size="sm"
                  className="h-8"
                  onClick={onUpdateClick}
                  disabled={updatingId === plugin.id || !sdkCompatible}
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  {t('marketplaceUpdateBtn')}
                </Button>
              ) : !isInstalled ? (
                <Button
                  size="sm"
                  className="h-8"
                  onClick={onInstallClick}
                  disabled={installingId === plugin.id || !sdkCompatible}
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  {t('marketplaceInstallBtn')}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 text-xs text-muted-foreground">
            {latestVersion && (
              <div className="flex items-center gap-1">
                <span className="font-mono">v{latestVersion.version}</span>
              </div>
            )}
            <div
              className="flex items-center gap-1"
              title={t('marketplaceReleasedOn', { date: releaseDate.full })}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {t('marketplaceReleasedOn', { date: releaseDate.short })}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              <span>{plugin.author}</span>
            </div>
            {plugin.homepage && (
              <a
                href={plugin.homepage}
                target="_blank"
                className="underline hover:text-primary transition-colors"
              >
                {plugin.homepage}
              </a>
            )}
          </div>

          {plugin.tags && plugin.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {plugin.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {plugin.screenshots && plugin.screenshots.length > 0 && (
            <MarketplaceScreenshots
              pluginId={plugin.id}
              pluginName={plugin.name}
              screenshots={plugin.screenshots}
            />
          )}
        </div>
      </div>
    );
  }
);

export { MarketplaceItem };
