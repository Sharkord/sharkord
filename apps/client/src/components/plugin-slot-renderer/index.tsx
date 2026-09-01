import { usePluginSlotDebug } from '@/features/app/hooks';
import { useCan, useHiddenPluginComponents } from '@/features/server/hooks';
import { usePluginComponentsBySlot } from '@/features/server/plugins/hooks';
import { Permission, type PluginSlot } from '@sharkord/shared';
import { memo } from 'react';
import { ErrorBoundary } from './error-boundary';
import { PlugSlotDebugWrapper } from './plugin-slot-debug-wrapper';

type TPluginSlotRendererProps = {
  slotId: PluginSlot;
  onlyPluginId?: string;
};

const PluginSlotRenderer = memo(
  ({ slotId, onlyPluginId }: TPluginSlotRendererProps) => {
    const debug = usePluginSlotDebug();
    const pluginComponentsBySlot = usePluginComponentsBySlot(slotId);
    const hiddenComponents = useHiddenPluginComponents();

    const can = useCan();

    if (!can(Permission.USE_PLUGINS)) {
      return null;
    }

    const content = Object.entries(pluginComponentsBySlot).map(
      ([pluginId, components]) =>
        components.map((Component, index) => {
          if (onlyPluginId && pluginId !== onlyPluginId) {
            return null;
          }

          if (hiddenComponents.includes(`${pluginId}:${slotId}`)) {
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
