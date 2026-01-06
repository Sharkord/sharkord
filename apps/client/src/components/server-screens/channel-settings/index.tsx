import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { memo } from 'react';
import type { TServerScreenBaseProps } from '../screens';
import { ServerScreenLayout } from '../server-screen-layout';
import { General } from './general';
import { ChannelPermissions } from './permissions';

type TChannelSettingsProps = TServerScreenBaseProps & {
  channelId: number;
};

const ChannelSettings = memo(({ close, channelId }: TChannelSettingsProps) => {
  return (
    <ServerScreenLayout close={close} title="Channel Settings">
      <div className="mx-auto max-w-4xl">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
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
