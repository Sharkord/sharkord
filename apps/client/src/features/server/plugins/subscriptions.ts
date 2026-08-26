import { logDebug } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import { handleSubscriptionError } from '../subscription-error';
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
      onError: handleSubscriptionError('onCommandsChange')
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
      onError: handleSubscriptionError('onComponentsChange')
    }
  );

  const onMetadataChangeSub = trpc.plugins.onMetadataChange.subscribe(
    undefined,
    {
      onData: (data) => {
        logDebug('[EVENTS] plugins.onMetadataChange', { data });
        setPluginsMetadata(data);
      },
      onError: handleSubscriptionError('onMetadataChange')
    }
  );

  return () => {
    onCommandsChangeSub.unsubscribe();
    onComponentsChangeSub.unsubscribe();
    onMetadataChangeSub.unsubscribe();
  };
};

export { subscribeToPlugins };
