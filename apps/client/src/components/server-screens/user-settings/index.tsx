import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sharkord/ui';
import { memo } from 'react';
import type { TServerScreenBaseProps } from '../screens';
import { ServerScreenLayout } from '../server-screen-layout';
import { Devices } from './devices';
import { Others } from './others';
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
            <TabsTrigger value="others">Others</TabsTrigger>
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
          <TabsContent value="others" className="space-y-6">
            <Others />
          </TabsContent>
        </Tabs>
      </div>
    </ServerScreenLayout>
  );
});

export { UserSettings };
