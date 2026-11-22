import { useCan, useHiddenPluginComponents } from '@/features/server/hooks';
import { usePluginPage } from '@/features/server/plugins/hooks';
import { Permission, PluginSlot } from '@sharkord/shared';
import { memo } from 'react';
import { PluginComponentFrame } from '../plugin-slot-renderer/plugin-component-frame';

type TPluginPageRendererProps = {
  pluginId: string;
  pageId: string;
};

const PluginPageRenderer = memo(
  ({ pluginId, pageId }: TPluginPageRendererProps) => {
    const page = usePluginPage(pluginId, pageId);
    const hiddenComponents = useHiddenPluginComponents();
    const can = useCan();

    const isHidden = hiddenComponents.includes(
      `${pluginId}:${PluginSlot.FULL_SCREEN}`
    );

    if (!page || isHidden || !can(Permission.USE_PLUGINS)) return null;

    const { component: Component } = page;

    return (
      <PluginComponentFrame pluginId={pluginId} slotId={`page:${pageId}`}>
        <Component />
      </PluginComponentFrame>
    );
  }
);

export { PluginPageRenderer };
