import { useCan } from '@/features/server/hooks';
import { usePluginComponentsBySlot } from '@/features/server/plugins/hooks';
import { isDebug } from '@/helpers/is-debug';
import { Permission, type PluginSlot } from '@sharkord/shared';
import { memo } from 'react';
import { ErrorBoundary } from './error-boundary';
import { PlugSlotDebugWrapper } from './plugin-slot-debug-wrapper';

type TPluginSlotRendererProps = {
  slotId: PluginSlot;
  debug?: boolean;
};

const PluginSlotRenderer = memo(
  ({ slotId, debug = isDebug() }: TPluginSlotRendererProps) => {
    const pluginComponentsBySlot = usePluginComponentsBySlot(slotId);
    const can = useCan();

    if (!can(Permission.USE_PLUGINS)) {
      return null;
    }

    const content = Object.entries(pluginComponentsBySlot).map(
      ([pluginId, components]) =>
        components.map((Component, index) => {
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
