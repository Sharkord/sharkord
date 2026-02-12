import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TServerScreenBaseProps } from '../screens';
import { ServerScreenLayout } from '../server-screen-layout';
import { Devices } from './devices';
import { Password } from './password';
import { Profile } from './profile';

type TUserSettingsProps = TServerScreenBaseProps;

const UserSettings = memo(({ close }: TUserSettingsProps) => {
  const { t } = useTranslation();

  return (
    <ServerScreenLayout close={close} title={t('userSettings.title')}>
      <div className="mx-auto max-w-4xl">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="profile">
              {t('userSettings.tabs.profile')}
            </TabsTrigger>
            <TabsTrigger value="devices">
              {t('userSettings.tabs.devices')}
            </TabsTrigger>
            <TabsTrigger value="password">
              {t('userSettings.tabs.password')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Profile />
          </TabsContent>
          <TabsContent value="devices" className="space-y-6">
            <Devices />
          </TabsContent>
          <TabsContent value="password" className="space-y-6">
            <Password />
          </TabsContent>
        </Tabs>
      </div>
    </ServerScreenLayout>
  );
});

export { UserSettings };
