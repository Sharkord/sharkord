import { logDebug } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import { handleSubscriptionError } from '../subscription-error';
import {
  processPluginComponents,
  setPluginCommands,
  setPluginComponentAccess,
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

  const onComponentAccessChangeSub =
    trpc.plugins.onComponentAccessChange.subscribe(undefined, {
      onData: (data) => {
        logDebug('[EVENTS] plugins.onComponentAccessChange', { data });
        setPluginComponentAccess(data);
      },
      onError: handleSubscriptionError('onComponentAccessChange')
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
    onComponentAccessChangeSub.unsubscribe();
    onPushSub.unsubscribe();
    onCommandsChangeSub.unsubscribe();
    onComponentsChangeSub.unsubscribe();
    onMetadataChangeSub.unsubscribe();
  };
};

export { subscribeToPlugins };
