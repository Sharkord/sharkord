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
import {
  BadgeCheck,
  Calendar,
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  User
} from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PluginLogo } from '../plugin-logo';
import { getLatestCompatibleVersion, isNewerVersion } from './helpers';
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
    const [isBusy, setIsBusy] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const { plugin, versions } = entry;
    const latestVersion = versions[0];

    const latestCompatibleVersion = useMemo(
      () => getLatestCompatibleVersion(versions),
      [versions]
    );

    const shownVersion = latestCompatibleVersion ?? latestVersion;

    const updateAvailable = useMemo(() => {
      if (!installedVersion || !latestCompatibleVersion) return false;

      return isNewerVersion(latestCompatibleVersion.version, installedVersion);
    }, [installedVersion, latestCompatibleVersion]);

    const releaseDate = useMemo(() => {
      const timestamp = shownVersion?.timestamp ?? 0;

      return {
        short: format(timestamp, 'PPP', { locale: dateLocale }),
        full: format(timestamp, 'PPP p', { locale: dateLocale })
      };
    }, [dateLocale, shownVersion?.timestamp]);

    const performInstall = useCallback(async () => {
      if (!latestCompatibleVersion) return;

      setIsBusy(true);

      try {
        const trpc = getTRPCClient();

        await trpc.plugins.install.mutate({
          pluginId: plugin.id,
          version: latestCompatibleVersion.version
        });

        toast.success(t('marketplaceInstallSuccess', { name: plugin.name }));

        await refetchInstalled();
      } catch (error) {
        toast.error(getTrpcError(error, t('marketplaceInstallError')));
      } finally {
        setIsBusy(false);
      }
    }, [plugin.id, latestCompatibleVersion, t, plugin.name, refetchInstalled]);

    const performUpdate = useCallback(async () => {
      if (!latestCompatibleVersion) return;

      setIsBusy(true);

      try {
        const trpc = getTRPCClient();

        await trpc.plugins.update.mutate({
          pluginId: plugin.id,
          version: latestCompatibleVersion.version
        });

        toast.success(
          t('pluginUpdated', {
            name: plugin.name,
            version: latestCompatibleVersion.version
          })
        );

        await refetchInstalled();
      } catch (error) {
        toast.error(getTrpcError(error, t('marketplaceUpdateError')));
      } finally {
        setIsBusy(false);
      }
    }, [latestCompatibleVersion, plugin.id, plugin.name, t, refetchInstalled]);

    const handleInstall = useCallback(() => {
      openDialog(Dialog.PLUGIN_INSTALL_CONFIRM, {
        pluginName: plugin.name,
        onConfirm: performInstall
      });
    }, [plugin.name, performInstall]);

    const handleUpdate = useCallback(() => {
      openDialog(Dialog.PLUGIN_INSTALL_CONFIRM, {
        pluginName: plugin.name,
        onConfirm: performUpdate
      });
    }, [plugin.name, performUpdate]);

    const handleToggleExpanded = useCallback(() => {
      setIsExpanded((expanded) => !expanded);
    }, []);

    const sdkTooltip = t('marketplaceSdkIncompatibleTooltip', {
      required: latestVersion?.sdkVersion,
      current: PLUGIN_SDK_VERSION
    });

    let action = (
      <Button size="sm" onClick={handleInstall} disabled={isBusy}>
        <Download className="h-4 w-4" />
        {t('marketplaceInstallBtn')}
      </Button>
    );

    if (updateAvailable && latestCompatibleVersion) {
      action = (
        <Button
          variant="secondary"
          size="sm"
          onClick={handleUpdate}
          disabled={isBusy}
        >
          <Download className="h-4 w-4" />
          {t('pluginUpdateTo', { version: latestCompatibleVersion.version })}
        </Button>
      );
    } else if (isInstalled) {
      action = (
        <span className="flex items-center gap-1 px-2 text-xs text-muted-foreground">
          <Check className="h-3.5 w-3.5" />
          {t('marketplaceInstalledBadge')}
        </span>
      );
    } else if (!latestCompatibleVersion) {
      action = (
        <Tooltip content={sdkTooltip}>
          <Badge variant="outline" className="text-muted-foreground">
            {t('marketplaceSdkIncompatible')}
          </Badge>
        </Tooltip>
      );
    }

    return (
      <div>
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={handleToggleExpanded}
            aria-expanded={isExpanded}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <PluginLogo src={plugin.logo} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">
                  {plugin.name}
                </span>
                {plugin.verified && (
                  <Tooltip content={t('marketplaceVerifiedTooltip')}>
                    <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />
                  </Tooltip>
                )}
                {shownVersion && (
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    v{shownVersion.version}
                  </span>
                )}
              </div>
              <p
                className={cn(
                  'text-xs text-muted-foreground',
                  !isExpanded && 'truncate'
                )}
              >
                {plugin.description}
              </p>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                isExpanded && 'rotate-180'
              )}
            />
          </button>

          {action}
        </div>

        {isExpanded && (
          <div className="space-y-3 px-4 pb-4 pl-16">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {plugin.author}
              </span>
              <span
                className="flex items-center gap-1"
                title={t('marketplaceReleasedOn', { date: releaseDate.full })}
              >
                <Calendar className="h-3.5 w-3.5" />
                {t('marketplaceReleasedOn', { date: releaseDate.short })}
              </span>
              {plugin.homepage && (
                <a
                  href={plugin.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 underline transition-colors hover:text-primary"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t('pluginHomepage')}
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
        )}
      </div>
    );
  }
);

export { MarketplaceItem };
