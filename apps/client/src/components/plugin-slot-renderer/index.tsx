import { usePluginSlotDebug } from '@/features/app/hooks';
import { useCan, useHiddenPluginComponents } from '@/features/server/hooks';
import { usePluginComponentsBySlot } from '@/features/server/plugins/hooks';
import { PluginIdContext } from '@/features/server/plugins/plugin-id-context';
import {
  Permission,
  type PluginSlot,
  type TPluginReactComponent,
  type TPluginSlotProps
} from '@sharkord/shared';
import { memo } from 'react';
import { ErrorBoundary } from './error-boundary';
import { PlugSlotDebugWrapper } from './plugin-slot-debug-wrapper';

type TPluginSlotRendererProps<S extends PluginSlot> = {
  slotId: S;
  onlyPluginId?: string;
  props?: TPluginSlotProps[S];
};

const PluginSlotRenderer = memo(
  <S extends PluginSlot>({
    slotId,
    onlyPluginId,
    props
  }: TPluginSlotRendererProps<S>) => {
    const debug = usePluginSlotDebug();
    const pluginComponentsBySlot = usePluginComponentsBySlot(slotId);
    const hiddenComponents = useHiddenPluginComponents();

    const can = useCan();

    if (!can(Permission.USE_PLUGINS)) {
      return null;
    }

    const entries = Object.entries(pluginComponentsBySlot);

    if (entries.length === 0) {
      return null;
    }

    const content = entries.map(([pluginId, components]) =>
      components.map((RawComponent, index) => {
        if (onlyPluginId && pluginId !== onlyPluginId) {
          return null;
        }

        if (hiddenComponents.includes(`${pluginId}:${slotId}`)) {
          return null;
        }

        const Component = RawComponent as TPluginReactComponent<
          TPluginSlotProps[S]
        >;

        const rendered = (
          <PluginIdContext.Provider value={pluginId}>
            <Component {...props!} />
          </PluginIdContext.Provider>
        );

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
