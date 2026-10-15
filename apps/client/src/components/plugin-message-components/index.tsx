import { PluginComponentFrame } from '@/components/plugin-slot-renderer/plugin-component-frame';
import { useCan } from '@/features/server/hooks';
import { usePluginMessageComponent } from '@/features/server/plugins/hooks';
import { Permission, type TPluginMessageComponent } from '@sharkord/shared';
import { memo } from 'react';

const DEFAULT_PROPS: Record<string, unknown> = {};

type TPluginMessageComponentItemProps = {
  pluginId: string;
  messageId: number;
  channelId: number;
  component: TPluginMessageComponent;
};

const PluginMessageComponentItem = memo(
  ({
    pluginId,
    messageId,
    channelId,
    component
  }: TPluginMessageComponentItemProps) => {
    const Component = usePluginMessageComponent(pluginId, component.name);

    if (!Component) return null;

    return (
      <PluginComponentFrame
        pluginId={pluginId}
        slotId={`message:${component.name}`}
      >
        <Component
          messageId={messageId}
          channelId={channelId}
          props={component.props ?? DEFAULT_PROPS}
        />
      </PluginComponentFrame>
    );
  }
);

type TPluginMessageComponentsProps = {
  pluginId: string;
  messageId: number;
  channelId: number;
  components: TPluginMessageComponent[];
};

const PluginMessageComponents = memo(
  ({
    pluginId,
    messageId,
    channelId,
    components
  }: TPluginMessageComponentsProps) => {
    const can = useCan();

    if (!can(Permission.USE_PLUGINS)) return null;

    return components.map((component, index) => (
      <PluginMessageComponentItem
        key={`${component.name}-${index}`}
        pluginId={pluginId}
        messageId={messageId}
        channelId={channelId}
        component={component}
      />
    ));
  }
);

export { PluginMessageComponents };
