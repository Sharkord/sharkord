import { usePluginsEnabled } from '@/features/server/hooks';
import type { TPluginInfo } from '@sharkord/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sharkord/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { InstalledPlugins } from './installed';
import { Marketplace } from './marketplace';

type TPluginsProps = {
  plugins: TPluginInfo[];
  loading: boolean;
  refetch: () => Promise<void>;
};

const Plugins = memo(({ plugins, loading, refetch }: TPluginsProps) => {
  const { t } = useTranslation('settings');
  const pluginsEnabled = usePluginsEnabled();

  return (
    <Tabs defaultValue="installed" className="w-full">
      <TabsList className="mb-4 grid w-full grid-cols-2">
        <TabsTrigger value="installed" disabled={!pluginsEnabled}>
          {t('installedTab')}
        </TabsTrigger>
        <TabsTrigger value="marketplace" disabled={!pluginsEnabled}>
          {t('marketplaceTab')}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="installed">
        <InstalledPlugins
          plugins={plugins}
          loading={loading}
          refetch={refetch}
        />
      </TabsContent>
      <TabsContent value="marketplace">
        <Marketplace plugins={plugins} refetchInstalled={refetch} />
      </TabsContent>
    </Tabs>
  );
});

export { Plugins };
