import { ErrorBoundary } from '@/components/plugin-slot-renderer/error-boundary';
import { PluginIdContext } from '@/features/server/plugins/plugin-id-context';
import type { TPluginTab } from '@sharkord/shared';
import { memo } from 'react';

type TPluginTabContentProps = {
  pluginId: string;
  tab: TPluginTab;
};

const PluginTabContent = memo(({ pluginId, tab }: TPluginTabContentProps) => {
  const Component = tab.component;

  return (
    <ErrorBoundary pluginId={pluginId} slotId={`tab:${tab.id}`}>
      <PluginIdContext.Provider value={pluginId}>
        <Component />
      </PluginIdContext.Provider>
    </ErrorBoundary>
  );
});

PluginTabContent.displayName = 'PluginTabContent';

export { PluginTabContent };
