import { Dialog } from '@/components/dialogs/dialogs';
import { openDialog } from '@/features/dialogs/actions';
import { usePluginsEnabled } from '@/features/server/hooks';
import { useFilePicker } from '@/hooks/use-file-picker';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import type { TPluginInfo } from '@sharkord/shared';
import { getTrpcError } from '@sharkord/shared';
import {
  IconButton,
  Input,
  LoadingCard,
  SettingsSection,
  Tooltip
} from '@sharkord/ui';
import { AlertCircle, Package, RefreshCw, Search, Upload } from 'lucide-react';
import { memo, useCallback, useMemo, useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { StatePanel } from '../../settings-shell/state-panel';
import { isPluginArchiveName, uploadPluginArchive } from './helpers';
import { InstalledPluginRow } from './installed-plugin-row';
import {
  getLatestCompatibleVersion,
  isNewerVersion
} from './marketplace/helpers';
import type { TMarketplaceData } from './marketplace/hooks';

const PLUGIN_ARCHIVE_ACCEPT = '.tar,.tar.gz,.tgz';

type TPluginMarketplaceInfo = {
  updateVersion?: string;
  isManual: boolean;
};

type TInstalledPluginsProps = {
  plugins: TPluginInfo[];
  loading: boolean;
  refetch: () => Promise<void>;
  marketplace: TMarketplaceData;
};

const InstalledPlugins = memo(
  ({ plugins, loading, refetch, marketplace }: TInstalledPluginsProps) => {
    const { t } = useTranslation('settings');
    const enabled = usePluginsEnabled();
    const openFilePicker = useFilePicker();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [search, setSearch] = useState('');

    const {
      entries,
      loading: marketplaceLoading,
      error: marketplaceError
    } = marketplace;

    const marketplaceInfo = useMemo(() => {
      const entriesById = new Map(
        entries.map((entry) => [entry.plugin.id, entry])
      );
      const canTellSource = !marketplaceLoading && !marketplaceError;
      const info = new Map<string, TPluginMarketplaceInfo>();

      for (const plugin of plugins) {
        const entry = entriesById.get(plugin.id);
        let updateVersion: string | undefined;

        if (entry) {
          const latest = getLatestCompatibleVersion(entry.versions);

          if (latest && isNewerVersion(latest.version, plugin.version)) {
            updateVersion = latest.version;
          }
        }

        info.set(plugin.id, {
          updateVersion,
          isManual: canTellSource && !entry
        });
      }

      return info;
    }, [entries, marketplaceLoading, marketplaceError, plugins]);

    const summary = useMemo(() => {
      const updates = plugins.filter(
        (plugin) => marketplaceInfo.get(plugin.id)?.updateVersion
      ).length;
      const failed = plugins.filter((plugin) => plugin.loadError).length;
      const parts = [t('pluginsSummaryInstalled', { count: plugins.length })];

      if (updates > 0) {
        parts.push(t('pluginsSummaryUpdates', { count: updates }));
      }

      if (failed > 0) {
        parts.push(t('pluginsSummaryFailed', { count: failed }));
      }

      return parts.join(' · ');
    }, [plugins, marketplaceInfo, t]);

    const filteredPlugins = useMemo(() => {
      const query = search.trim().toLowerCase();

      if (!query) return plugins;

      return plugins.filter(
        (plugin) =>
          plugin.name.toLowerCase().includes(query) ||
          plugin.description.toLowerCase().includes(query) ||
          plugin.author.toLowerCase().includes(query)
      );
    }, [plugins, search]);

    const handleRefresh = useCallback(async () => {
      setIsRefreshing(true);

      try {
        await refetch();
        toast.success(t('pluginsRefreshed'));
      } catch (error) {
        toast.error(getTrpcError(error, t('failedRefreshPlugins')));
      } finally {
        setIsRefreshing(false);
      }
    }, [refetch, t]);

    const installArchive = useCallback(
      async (file: File) => {
        setIsUploading(true);

        try {
          const plugin = await uploadPluginArchive(file);

          toast.success(
            t('pluginUploadSuccess', {
              name: plugin.name,
              version: plugin.version
            })
          );
        } catch (error) {
          toast.error(getTrpcError(error, t('failedUploadPlugin')));
        } finally {
          setIsUploading(false);
          refetch();
        }
      },
      [refetch, t]
    );

    const confirmInstallArchive = useCallback(
      (file: File) => {
        if (!isPluginArchiveName(file.name)) {
          toast.error(t('pluginUploadWrongType'));

          return;
        }

        openDialog(Dialog.PLUGIN_INSTALL_CONFIRM, {
          pluginName: file.name,
          onConfirm: () => installArchive(file)
        });
      },
      [installArchive, t]
    );

    const handleUpload = useCallback(async () => {
      const [file] = await openFilePicker(PLUGIN_ARCHIVE_ACCEPT);

      if (file) confirmInstallArchive(file);
    }, [openFilePicker, confirmInstallArchive]);

    const canDrop = enabled && !isUploading;

    const handleDragOver = useCallback(
      (event: DragEvent<HTMLDivElement>) => {
        if (!canDrop || !event.dataTransfer.types.includes('Files')) return;

        event.preventDefault();
        setIsDragging(true);
      },
      [canDrop]
    );

    const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
        return;
      }

      setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
      (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);

        const [file] = event.dataTransfer.files;

        if (canDrop && file) confirmInstallArchive(file);
      },
      [canDrop, confirmInstallArchive]
    );

    const handleSearchChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) =>
        setSearch(event.target.value),
      []
    );

    const handleToggle = useCallback(
      async (pluginId: string, enabled: boolean) => {
        const trpc = getTRPCClient();

        try {
          await trpc.plugins.toggle.mutate({ pluginId, enabled });
          toast.success(enabled ? t('pluginEnabled') : t('pluginDisabled'));
        } catch (error) {
          toast.error(getTrpcError(error, t('failedTogglePlugin')));
        } finally {
          refetch();
        }
      },
      [refetch, t]
    );

    const handleRemove = useCallback(
      async (pluginId: string) => {
        const trpc = getTRPCClient();

        try {
          await trpc.plugins.remove.mutate({ pluginId });
          toast.success(t('pluginRemoved'));
        } catch (error) {
          toast.error(getTrpcError(error, t('failedRemovePlugin')));
        } finally {
          refetch();
        }
      },
      [refetch, t]
    );

    const handleUpdate = useCallback(
      async (plugin: TPluginInfo, version: string) => {
        const trpc = getTRPCClient();

        try {
          await trpc.plugins.update.mutate({ pluginId: plugin.id, version });
          toast.success(t('pluginUpdated', { name: plugin.name, version }));
        } catch (error) {
          toast.error(getTrpcError(error, t('marketplaceUpdateError')));
        } finally {
          refetch();
        }
      },
      [refetch, t]
    );

    if (loading) {
      return <LoadingCard className="h-[600px]" />;
    }

    if (!enabled) {
      return (
        <SettingsSection title={t('pluginsTitle')}>
          <StatePanel
            icon={AlertCircle}
            title={t('pluginsDisabledTitle')}
            description={t('pluginsDisabledDesc')}
          />
        </SettingsSection>
      );
    }

    let content = (
      <StatePanel
        icon={Package}
        title={t('noPluginsTitle')}
        description={t('noPluginsDesc')}
      />
    );

    if (plugins.length > 0) {
      content = (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={handleSearchChange}
              placeholder={t('pluginsFilterPlaceholder')}
              className="pl-9"
            />
          </div>
          {filteredPlugins.length === 0 ? (
            <StatePanel icon={Search} title={t('marketplaceNoResults')} />
          ) : (
            <div className="divide-y rounded-lg border">
              {filteredPlugins.map((plugin) => (
                <InstalledPluginRow
                  key={plugin.id}
                  plugin={plugin}
                  updateVersion={marketplaceInfo.get(plugin.id)?.updateVersion}
                  isManual={marketplaceInfo.get(plugin.id)?.isManual ?? false}
                  onToggle={handleToggle}
                  onRemove={handleRemove}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          )}
        </>
      );
    }

    let dropZoneLabel = t('pluginDropHint');

    if (isUploading) {
      dropZoneLabel = t('pluginUploading');
    } else if (isDragging) {
      dropZoneLabel = t('pluginDropActive');
    }

    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <SettingsSection
          title={t('pluginsTitle')}
          description={summary}
          className={cn(
            'transition-shadow',
            isDragging &&
              'ring-2 ring-primary ring-offset-2 ring-offset-background'
          )}
          action={
            <Tooltip content={t('refreshBtn')}>
              <IconButton
                icon={RefreshCw}
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                aria-label={t('refreshBtn')}
                className={cn(isRefreshing && '[&_svg]:animate-spin')}
              />
            </Tooltip>
          }
        >
          {content}

          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 text-xs text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary disabled:pointer-events-none disabled:opacity-60',
              isDragging && 'border-primary bg-primary/5 text-primary'
            )}
          >
            <Upload className="h-4 w-4" />
            {dropZoneLabel}
          </button>
        </SettingsSection>
      </div>
    );
  }
);

export { InstalledPlugins };
