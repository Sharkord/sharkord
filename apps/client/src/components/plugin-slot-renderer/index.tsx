import { usePluginSlotDebug } from '@/features/app/hooks';
import { useCan } from '@/features/server/hooks';
import { usePluginComponentsBySlot } from '@/features/server/plugins/hooks';
import { Permission, type PluginSlot } from '@sharkord/shared';
import { memo } from 'react';
import { ErrorBoundary } from './error-boundary';
import { PlugSlotDebugWrapper } from './plugin-slot-debug-wrapper';

type TPluginSlotRendererProps = {
  slotId: PluginSlot;
  activeFullscreenPluginId?: string;
};

const PluginSlotRenderer = memo(
  ({ slotId, activeFullscreenPluginId }: TPluginSlotRendererProps) => {
    const debug = usePluginSlotDebug();
    const pluginComponentsBySlot = usePluginComponentsBySlot(slotId);

    const can = useCan();

    if (!can(Permission.USE_PLUGINS)) {
      return null;
    }

    const content = Object.entries(pluginComponentsBySlot).map(
      ([pluginId, components]) =>
        components.map((Component, index) => {
          if (
            activeFullscreenPluginId &&
            pluginId !== activeFullscreenPluginId
          ) {
            return null;
          }

          const rendered = <Component />;

          const wrappedContent = debug ? (
            <PlugSlotDebugWrapper pluginId={pluginId} slotId={slotId}>
              {rendered}
            </PlugSlotDebugWrapper>
          ) : (
            rendered
          );

          return (
            <ErrorBoundary
              pluginId={pluginId}
              slotId={slotId}
              key={`${pluginId}-${index}`}
            >
              {wrappedContent}
            </ErrorBoundary>
          );
        })
    );

    return <>{content}</>;
  }
);

export { PluginSlotRenderer };
