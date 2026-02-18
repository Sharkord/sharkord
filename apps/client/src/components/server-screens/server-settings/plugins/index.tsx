import { Dialog } from '@/components/dialogs/dialogs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { LoadingCard } from '@/components/ui/loading-card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { openDialog } from '@/features/dialogs/actions';
import { useAdminPlugins } from '@/features/server/admin/hooks';
import { usePluginsEnabled } from '@/features/server/hooks';
import { getTrpcError } from '@sharkord/shared';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import type { TPluginInfo } from '@sharkord/shared';
import {
  AlertCircle,
  FileText,
  Package,
  RefreshCw,
  Settings,
  Terminal,
  User
} from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { toast } from 'sonner';

type TPluginItemProps = {
  plugin: TPluginInfo;
  onToggle: (pluginId: string, enabled: boolean) => Promise<void>;
};

const PluginItem = memo(({ plugin, onToggle }: TPluginItemProps) => {
  const [isToggling, setIsToggling] = useState(false);

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
          <img
            src={plugin.logo}
            alt={`${plugin.name} logo`}
            className="w-12 h-12 rounded-md object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : (
          <div
            className={cn(
              'w-12 h-12 rounded-md bg-muted flex items-center justify-center'
            )}
          >
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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewLogs}
              className="h-8"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              Logs
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewCommands}
              className="h-8"
              disabled={!plugin.enabled}
            >
              <Terminal className="w-4 h-4 mr-1.5" />
              Commands
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewSettings}
              className="h-8"
              disabled={!plugin.enabled}
            >
              <Settings className="w-4 h-4 mr-1.5" />
              Settings
            </Button>
            {plugin.loadError ? (
              <Badge variant="destructive">Error</Badge>
            ) : (
              <Badge variant={plugin.enabled ? 'default' : 'outline'}>
                {plugin.enabled ? 'Enabled' : 'Disabled'}
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
              <>
                <a
                  href={plugin.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-primary transition-colors"
                >
                  {plugin.homepage}
                </a>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
});

const Plugins = memo(() => {
  const enabled = usePluginsEnabled();
  const { loading, plugins, refetch } = useAdminPlugins();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success('Plugins list refreshed');
    } catch (error) {
      toast.error(getTrpcError(error, 'Failed to refresh plugins list'));
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleToggle = useCallback(
    async (pluginId: string, enabled: boolean) => {
      const trpc = getTRPCClient();

      try {
        await trpc.plugins.toggle.mutate({ pluginId, enabled });
        toast.success(
          `Plugin ${enabled ? 'enabled' : 'disabled'} successfully`
        );
      } catch (error) {
        toast.error(getTrpcError(error, 'Failed to toggle plugin'));
      } finally {
        refetch();
      }
    },
    [refetch]
  );

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Plugins</CardTitle>
            <CardDescription>
              Manage installed plugins and extend your Sharkord server with
              additional features and functionality.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || loading || !enabled}
            className="shrink-0"
          >
            <RefreshCw
              className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')}
            />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {enabled ? (
          <>
            {plugins.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Package className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-1">
                  No plugins installed
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Install plugins to add new features and extend the
                  functionality of your Sharkord server.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {plugins.map((plugin, index) => (
                  <div key={plugin.id}>
                    <PluginItem plugin={plugin} onToggle={handleToggle} />
                    {index < plugins.length - 1 && (
                      <Separator className="mt-3" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-1">Plugins are disabled</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Plugins have been disabled for this server. Enable plugins in the
              server settings to manage and use plugins.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export { Plugins };
