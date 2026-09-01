import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useCan } from '@/features/server/hooks';
import { loadPluginTabs } from '@/features/server/plugins/actions';
import {
  usePluginCommands,
  usePluginTabs
} from '@/features/server/plugins/hooks';
import { getTRPCClient } from '@/lib/trpc';
import {
  getTrpcError,
  Permission,
  type TPluginInfo,
  type TPluginSettingDefinition
} from '@sharkord/shared';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  LoadingCard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@sharkord/ui';
import { AlertCircle, Package } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ImageWithFallback } from '../plugins/marketplace/image-with-fallback';
import { PluginCommands } from './commands';
import { PluginLogs } from './logs';
import { PluginPermissions } from './permissions';
import { PluginSettings } from './settings';
import { PluginTabContent } from './tab-content';

const usePluginSettings = (pluginId: string) => {
  const { t } = useTranslation('settings');
  const [loading, setLoading] = useState(true);
  const [definitions, setDefinitions] = useState<TPluginSettingDefinition[]>(
    []
  );
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [secretsSet, setSecretsSet] = useState<string[]>([]);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);

      const trpc = getTRPCClient();

      try {
        const result = await trpc.plugins.getSettings.query({ pluginId });

        setDefinitions(result.definitions);
        setValues(result.values);
        setSecretsSet(result.secretsSet);
      } catch (error) {
        toast.error(getTrpcError(error, t('failedLoadPluginSettings')));
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [pluginId, t]);

  return { definitions, values, secretsSet, loading };
};

type TPluginViewProps = {
  plugin: TPluginInfo;
};

const PluginView = memo(({ plugin }: TPluginViewProps) => {
  const { t } = useTranslation('settings');
  const customTabs = usePluginTabs(plugin.id);
  const can = useCan();
  const canManagePluginPermissions = can(Permission.MANAGE_PLUGIN_PERMISSIONS);

  useEffect(() => {
    loadPluginTabs(plugin.id);
  }, [plugin.id]);
  const { definitions, values, secretsSet, loading } = usePluginSettings(
    plugin.id
  );
  const commandsMap = usePluginCommands();

  const hasCommands = (commandsMap[plugin.id] ?? []).length > 0;
  const hasSettings = definitions.length > 0;

  let defaultTab = 'logs';

  if (hasCommands) defaultTab = 'commands';
  if (hasSettings) defaultTab = 'settings';

  const identity = (
    <SettingsSection
      title={plugin.name}
      description={plugin.description}
      action={
        <ImageWithFallback
          src={plugin.logo}
          alt=""
          className="h-12 w-12 rounded-md object-cover"
          iconFallback={<Package className="h-6 w-6 text-muted-foreground" />}
        />
      }
    >
      <div className="flex flex-wrap items-center gap-x-4 text-xs text-muted-foreground">
        <span className="font-mono">v{plugin.version}</span>
        <span>{plugin.author}</span>
        {plugin.homepage && (
          <a
            href={plugin.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="underline transition-colors hover:text-primary"
          >
            {plugin.homepage}
          </a>
        )}
      </div>

      {plugin.loadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('pluginLoadErrorTitle')}</AlertTitle>
          <AlertDescription>{plugin.loadError}</AlertDescription>
        </Alert>
      )}
    </SettingsSection>
  );

  if (loading) {
    return (
      <>
        {identity}
        <LoadingCard className="h-64" />
      </>
    );
  }

  // a plugin that only produces logs gets no sub navigation at all
  if (
    !hasSettings &&
    !hasCommands &&
    !canManagePluginPermissions &&
    customTabs.length === 0
  ) {
    return (
      <>
        {identity}
        <PluginLogs pluginId={plugin.id} />
      </>
    );
  }

  return (
    <>
      {identity}

      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-4">
          {hasSettings && (
            <TabsTrigger value="settings">{t('pluginSettingsTab')}</TabsTrigger>
          )}
          {hasCommands && (
            <TabsTrigger value="commands">{t('pluginCommandsTab')}</TabsTrigger>
          )}
          <TabsTrigger value="logs">{t('pluginLogsTab')}</TabsTrigger>
          {canManagePluginPermissions && (
            <TabsTrigger value="permissions">
              {t('pluginPermissionsTab')}
            </TabsTrigger>
          )}
          {customTabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {hasSettings && (
          <TabsContent value="settings" className="space-y-6">
            <PluginSettings
              pluginId={plugin.id}
              definitions={definitions}
              values={values}
              secretsSet={secretsSet}
            />
          </TabsContent>
        )}

        {hasCommands && (
          <TabsContent value="commands" className="space-y-6">
            <PluginCommands pluginId={plugin.id} />
          </TabsContent>
        )}

        <TabsContent value="logs" className="space-y-6">
          <PluginLogs pluginId={plugin.id} />
        </TabsContent>

        {canManagePluginPermissions && (
          <TabsContent value="permissions" className="space-y-6">
            <PluginPermissions pluginId={plugin.id} />
          </TabsContent>
        )}

        {customTabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="space-y-6">
            <PluginTabContent pluginId={plugin.id} tab={tab} />
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
});

export { PluginView };
