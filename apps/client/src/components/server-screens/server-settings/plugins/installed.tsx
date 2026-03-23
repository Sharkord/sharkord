import { Dialog } from '@/components/dialogs/dialogs';
import { openDialog, requestConfirmation } from '@/features/dialogs/actions';
import { usePluginsEnabled } from '@/features/server/hooks';
import { getTRPCClient } from '@/lib/trpc';
import type { TPluginInfo } from '@sharkord/shared';
import { getTrpcError } from '@sharkord/shared';
import {
  Alert,
  AlertDescription,
  Badge,
  Card,
  CardContent,
  IconButton,
  LoadingCard,
  Switch,
  Tooltip
} from '@sharkord/ui';
import {
  AlertCircle,
  FileText,
  Package,
  Settings,
  Terminal,
  Trash2,
  User
} from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ListWithSeparators } from './list-with-separators';
import { ImageWithFallback } from './marketplace/image-with-fallback';
import { SectionHeader } from './section-header';
import { StatePanel } from './state-panel';

type TPluginItemProps = {
  plugin: TPluginInfo;
  onToggle: (pluginId: string, enabled: boolean) => Promise<void>;
  onRemove: (pluginId: string) => Promise<void>;
};

const PluginItem = memo(({ plugin, onToggle, onRemove }: TPluginItemProps) => {
  const { t } = useTranslation('settings');
  const [isToggling, setIsToggling] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleToggle = useCallback(
    async (checked: boolean) => {
      setIsToggling(true);
      try {
        await onToggle(plugin.id, checked);
      } finally {
        setIsToggling(false);
      }
    },
    [plugin.id, onToggle]
  );

  const handleRemove = useCallback(async () => {
    const confirmed = await requestConfirmation({
      title: t('removePluginTitle'),
      message: t('removePluginConfirm', { name: plugin.name }),
      confirmLabel: t('removeBtn'),
      variant: 'danger'
    });

    if (!confirmed) return;

    setIsRemoving(true);

    try {
      await onRemove(plugin.id);
    } finally {
      setIsRemoving(false);
    }
  }, [plugin.id, plugin.name, onRemove, t]);

  const handleViewLogs = useCallback(() => {
    openDialog(Dialog.PLUGIN_LOGS, {
      pluginName: plugin.name,
      pluginId: plugin.id,
      logs: [] // will be populated by subscription later
    });
  }, [plugin.name, plugin.id]);

  const handleViewCommands = useCallback(() => {
    openDialog(Dialog.PLUGIN_COMMANDS, {
      pluginId: plugin.id
    });
  }, [plugin.id]);

  const handleViewSettings = useCallback(() => {
    openDialog(Dialog.PLUGIN_SETTINGS, {
      pluginId: plugin.id,
      pluginName: plugin.name
    });
  }, [plugin.id, plugin.name]);

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex-shrink-0">
        {plugin.logo ? (
          <ImageWithFallback
            src={plugin.logo}
            alt={`${plugin.name} logo`}
            className="w-12 h-12 rounded-md object-cover"
            iconFallback={<Package className="w-6 h-6 text-muted-foreground" />}
          />
        ) : (
          <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
            <Package className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight">
              {plugin.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {plugin.description}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Tooltip content={t('logsBtn')}>
              <IconButton
                icon={FileText}
                variant="ghost"
                size="sm"
                onClick={handleViewLogs}
              />
            </Tooltip>
            <Tooltip content={t('commandsBtn')}>
              <IconButton
                icon={Terminal}
                variant="ghost"
                size="sm"
                onClick={handleViewCommands}
                disabled={!plugin.enabled}
              />
            </Tooltip>
            <Tooltip content={t('settingsBtn')}>
              <IconButton
                icon={Settings}
                variant="ghost"
                size="sm"
                onClick={handleViewSettings}
                disabled={!plugin.enabled}
              />
            </Tooltip>
            <Tooltip content={t('removeBtn')}>
              <IconButton
                icon={Trash2}
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={isRemoving}
              />
            </Tooltip>
            {plugin.loadError ? (
              <Badge variant="destructive">{t('errorBadge')}</Badge>
            ) : (
              <Badge variant={plugin.enabled ? 'default' : 'outline'}>
                {plugin.enabled ? t('enabledBadge') : t('disabledBadge')}
              </Badge>
            )}
            <Switch
              checked={plugin.enabled}
              onCheckedChange={handleToggle}
              disabled={isToggling}
            />
          </div>
        </div>

        {plugin.loadError && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {plugin.loadError}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap items-center gap-x-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="font-mono">v{plugin.version}</span>
          </div>
          <div className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            <span>{plugin.author}</span>
          </div>
          <div className="flex items-center gap-1">
            {plugin.homepage ? (
              <a
                href={plugin.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary transition-colors"
              >
                {plugin.homepage}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
});

type TInstalledPluginsProps = {
  plugins: TPluginInfo[];
  loading: boolean;
  refetch: () => Promise<void>;
};

const InstalledPlugins = memo(
  ({ plugins, loading, refetch }: TInstalledPluginsProps) => {
    const { t } = useTranslation('settings');
    const enabled = usePluginsEnabled();
    const [isRefreshing, setIsRefreshing] = useState(false);

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

    if (loading) {
      return <LoadingCard className="h-[600px]" />;
    }

    return (
      <Card>
        <SectionHeader
          title={t('pluginsTitle')}
          description={t('pluginsManageDesc')}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          refreshDisabled={isRefreshing || loading || !enabled}
          refreshLabel={t('refreshBtn')}
        />
        <CardContent>
          {enabled ? (
            <>
              {plugins.length === 0 ? (
                <StatePanel
                  icon={Package}
                  title={t('noPluginsTitle')}
                  description={t('noPluginsDesc')}
                />
              ) : (
                <ListWithSeparators
                  items={plugins}
                  getKey={(plugin) => plugin.id}
                  renderItem={(plugin) => (
                    <PluginItem
                      plugin={plugin}
                      onToggle={handleToggle}
                      onRemove={handleRemove}
                    />
                  )}
                />
              )}
            </>
          ) : (
            <StatePanel
              icon={AlertCircle}
              title={t('pluginsDisabledTitle')}
              description={t('pluginsDisabledDesc')}
            />
          )}
        </CardContent>
      </Card>
    );
  }
);

export { InstalledPlugins };
