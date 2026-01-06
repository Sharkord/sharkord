import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { memo } from 'react';
import type { TServerScreenBaseProps } from '../screens';
import { ServerScreenLayout } from '../server-screen-layout';
import { General } from './general';

type TCategorySettingsProps = TServerScreenBaseProps & {
  categoryId: number;
};

const CategorySettings = memo(
  ({ close, categoryId }: TCategorySettingsProps) => {
    return (
      <ServerScreenLayout close={close} title="Category Settings">
        <div className="mx-auto max-w-4xl">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="general">General</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              <General categoryId={categoryId} />
            </TabsContent>
          </Tabs>
        </div>
      </ServerScreenLayout>
    );
  }
);

export { CategorySettings };
