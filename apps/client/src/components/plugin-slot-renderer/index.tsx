import { usePluginComponentContext } from '@/features/server/hooks';
import { usePluginComponentsBySlot } from '@/features/server/plugins/hooks';
import { isDebug } from '@/helpers/is-debug';
import type { PluginSlot, TPluginSlotContext } from '@sharkord/shared';
import { memo } from 'react';
import { PlugSlotDebugWrapper } from './plugin-slot-debug-wrapper';

type TSlotContextProviderProps = {
  children: (ctx: TPluginSlotContext) => React.ReactNode;
};

const SlotContextProvider = memo(({ children }: TSlotContextProviderProps) => {
  const context = usePluginComponentContext();

  return <>{children(context)}</>;
});

type TPluginSlotRendererProps = {
  slotName: PluginSlot;
  debug?: boolean;
};

const PluginSlotRenderer = memo(
  ({ slotName, debug = isDebug() }: TPluginSlotRendererProps) => {
    const pluginComponentsBySlot = usePluginComponentsBySlot(slotName);

    const content = Object.entries(pluginComponentsBySlot).map(
      ([pluginId, components]) =>
        components.map((Component, index) => {
          const content = (
            <SlotContextProvider>
              {(ctx) => <Component {...ctx} />}
            </SlotContextProvider>
          );

          if (!debug) {
            return <>{content}</>;
          }

          return (
            <PlugSlotDebugWrapper
              key={`${pluginId}-${index}`}
              pluginId={pluginId}
              slotId={slotName}
            >
              {content}
            </PlugSlotDebugWrapper>
          );
        })
    );

    return <>{content}</>;
  }
);

export { PluginSlotRenderer };
