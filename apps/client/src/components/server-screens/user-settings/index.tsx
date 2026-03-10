import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sharkord/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TServerScreenBaseProps } from '../screens';
import { ServerScreenLayout } from '../server-screen-layout';
import { Devices } from './devices';
import { Notifications } from './notifications';
import { Others } from './others';
import { Password } from './password';
import { Profile } from './profile';

type TUserSettingsProps = TServerScreenBaseProps;

const UserSettings = memo(({ close }: TUserSettingsProps) => {
  const { t } = useTranslation('settings');

  return (
    <ServerScreenLayout close={close} title={t('userSettingsTitle')}>
      <div className="mx-auto max-w-4xl">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="profile">{t('profileTab')}</TabsTrigger>
            <TabsTrigger value="devices">{t('devicesTab')}</TabsTrigger>
            <TabsTrigger value="password">{t('passwordTab')}</TabsTrigger>
            <TabsTrigger value="notifications">
              {t('notificationsTab')}
            </TabsTrigger>
            <TabsTrigger value="others">{t('othersTab')}</TabsTrigger>
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
          <TabsContent value="notifications" className="space-y-6">
            <Notifications />
          </TabsContent>
          <TabsContent value="others" className="space-y-6">
            <Others />
          </TabsContent>
        </Tabs>
      </div>
    </ServerScreenLayout>
  );
});

export { UserSettings };
