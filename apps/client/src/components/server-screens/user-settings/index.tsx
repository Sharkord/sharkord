import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { memo } from 'react';
import type { TServerScreenBaseProps } from '../screens';
import { ServerScreenLayout } from '../server-screen-layout';
import { Devices } from './devices';
import { Password } from './password';
import { Profile } from './profile';

type TUserSettingsProps = TServerScreenBaseProps;

const UserSettings = memo(({ close }: TUserSettingsProps) => {
  return (
    <ServerScreenLayout close={close} title="User Settings">
      <div className="mx-auto max-w-4xl">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
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
