import { logDebug } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import {
  processPluginComponents,
  setPluginCommands,
  setPluginComponents,
  setPluginsMetadata
} from './actions';

const subscribeToPlugins = () => {
  const trpc = getTRPCClient();

  const onCommandsChangeSub = trpc.plugins.onCommandsChange.subscribe(
    undefined,
    {
      onData: (data) => {
        logDebug('[EVENTS] plugins.onCommandsChange', { data });
        setPluginCommands(data);
      },
      onError: (err) =>
        console.error('onCommandsChange subscription error:', err)
    }
  );

  const onComponentsChangeSub = trpc.plugins.onComponentsChange.subscribe(
    undefined,
    {
      onData: async (data) => {
        const components = await processPluginComponents(data);

        logDebug('[EVENTS] plugins.onComponentsChange', { data, components });
        setPluginComponents(components);
      },
      onError: (err) =>
        console.error('onComponentsChange subscription error:', err)
    }
  );

  const onMetadataChangeSub = trpc.plugins.onMetadataChange.subscribe(
    undefined,
    {
      onData: (data) => {
        logDebug('[EVENTS] plugins.onMetadataChange', { data });
        setPluginsMetadata(data);
      },
      onError: (err) =>
        console.error('onMetadataChange subscription error:', err)
    }
  );

  return () => {
    onCommandsChangeSub.unsubscribe();
    onComponentsChangeSub.unsubscribe();
    onMetadataChangeSub.unsubscribe();
  };
};

export { subscribeToPlugins };
