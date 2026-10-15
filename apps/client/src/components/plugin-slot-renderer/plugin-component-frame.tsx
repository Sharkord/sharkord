import { usePluginSlotDebug } from '@/features/app/hooks';
import { PluginIdContext } from '@/features/server/plugins/plugin-id-context';
import { memo, type ReactNode } from 'react';
import { ErrorBoundary } from './error-boundary';
import { PlugSlotDebugWrapper } from './plugin-slot-debug-wrapper';

type TPluginComponentFrameProps = {
  pluginId: string;
  slotId: string;
  children: ReactNode;
};

const PluginComponentFrame = memo(
  ({ pluginId, slotId, children }: TPluginComponentFrameProps) => {
    const debug = usePluginSlotDebug();

    const content = (
      <PluginIdContext.Provider value={pluginId}>
        {children}
      </PluginIdContext.Provider>
    );

    return (
      <ErrorBoundary pluginId={pluginId} slotId={slotId}>
        {debug ? (
          <PlugSlotDebugWrapper pluginId={pluginId} slotId={slotId}>
            {content}
          </PlugSlotDebugWrapper>
        ) : (
          content
        )}
      </ErrorBoundary>
    );
  }
);

export { PluginComponentFrame };
