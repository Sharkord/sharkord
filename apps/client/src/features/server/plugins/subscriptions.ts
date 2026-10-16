import { logDebug } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import { handleSubscriptionError } from '../subscription-error';
import {
  processPluginComponents,
  setPluginCapabilityAccess,
  setPluginCommands,
  setPluginComponents,
  setPluginsMetadata
} from './actions';
import { dispatchPluginPush } from './push-registry';

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

  const onCapabilityAccessChangeSub =
    trpc.plugins.onCapabilityAccessChange.subscribe(undefined, {
      onData: (data) => {
        logDebug('[EVENTS] plugins.onCapabilityAccessChange', { data });
        setPluginCapabilityAccess(data);
      },
      onError: handleSubscriptionError('onCapabilityAccessChange')
    });

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

  const onPushSub = trpc.plugins.onPush.subscribe(undefined, {
    onData: ({ pluginId, data }) => {
      logDebug('[EVENTS] plugins.onPush', { pluginId });
      dispatchPluginPush(pluginId, data);
    },
    onError: handleSubscriptionError('onPush')
  });

  return () => {
    onCapabilityAccessChangeSub.unsubscribe();
    onPushSub.unsubscribe();
    onCommandsChangeSub.unsubscribe();
    onComponentsChangeSub.unsubscribe();
    onMetadataChangeSub.unsubscribe();
  };
};

export { subscribeToPlugins };
