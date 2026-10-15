import { useCan, useHiddenPluginComponents } from '@/features/server/hooks';
import { usePluginComponentsBySlot } from '@/features/server/plugins/hooks';
import {
  Permission,
  PluginSlot,
  type TPluginReactComponent,
  type TPluginSlotProps
} from '@sharkord/shared';
import { memo } from 'react';
import { PluginComponentFrame } from './plugin-component-frame';

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
    const pluginComponentsBySlot = usePluginComponentsBySlot(slotId);
    const hiddenComponents = useHiddenPluginComponents();

    const can = useCan();

    // the connect screen renders before anyone has signed in, so nobody can
    // hold the permission there yet
    if (slotId !== PluginSlot.CONNECT_SCREEN && !can(Permission.USE_PLUGINS)) {
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

        return (
          <PluginComponentFrame
            pluginId={pluginId}
            slotId={slotId}
            key={`${pluginId}-${index}`}
          >
            <Component {...props!} />
          </PluginComponentFrame>
        );
      })
    );

    return <>{content}</>;
  }
);

export { PluginSlotRenderer };
