import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sharkord/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TServerScreenBaseProps } from '../screens';
import { ServerScreenLayout } from '../server-screen-layout';
import { General } from './general';
import { ChannelPermissions } from './permissions';

type TChannelSettingsProps = TServerScreenBaseProps & {
  channelId: number;
};

const ChannelSettings = memo(({ close, channelId }: TChannelSettingsProps) => {
  const { t } = useTranslation('settings');

  return (
    <ServerScreenLayout close={close} title={t('channelSettingsTitle')}>
      <div className="mx-auto max-w-4xl">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="general">{t('generalTab')}</TabsTrigger>
            <TabsTrigger value="permissions">{t('permissionsTab')}</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <General channelId={channelId} />
          </TabsContent>
          <TabsContent value="permissions" className="space-y-6">
            <ChannelPermissions channelId={channelId} />
          </TabsContent>
        </Tabs>
      </div>
    </ServerScreenLayout>
  );
});

export { ChannelSettings };
