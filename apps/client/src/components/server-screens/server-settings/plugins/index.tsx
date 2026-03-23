import { useAdminPlugins } from '@/features/server/admin/hooks';
import { usePluginsEnabled } from '@/features/server/hooks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sharkord/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { InstalledPlugins } from './installed';
import { Marketplace } from './marketplace';

const Plugins = memo(() => {
  const { t } = useTranslation('settings');
  const { plugins, loading, refetch } = useAdminPlugins();
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
