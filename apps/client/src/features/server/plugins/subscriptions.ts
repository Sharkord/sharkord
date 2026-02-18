import { getTRPCClient } from '@/lib/trpc';
import {
  processPluginComponents,
  setPluginCommands,
  setPluginComponents
} from './actions';

const subscribeToPlugins = () => {
  const trpc = getTRPCClient();

  const onCommandsChangeSub = trpc.plugins.onCommandsChange.subscribe(
    undefined,
    {
      onData: (data) => setPluginCommands(data),
      onError: (err) =>
        console.error('onCommandsChange subscription error:', err)
    }
  );

  const onComponentsChangeSub = trpc.plugins.onComponentsChange.subscribe(
    undefined,
    {
      onData: async (data) => {
        const components = await processPluginComponents(data);

        setPluginComponents(components);
      },
      onError: (err) =>
        console.error('onComponentsChange subscription error:', err)
    }
  );

  return () => {
    onCommandsChangeSub.unsubscribe();
    onComponentsChangeSub.unsubscribe();
  };
};

export { subscribeToPlugins };
