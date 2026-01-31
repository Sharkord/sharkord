import { getTRPCClient } from '@/lib/trpc';
import { setPluginCommands } from './actions';

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

  return () => {
    onCommandsChangeSub.unsubscribe();
  };
};

export { subscribeToPlugins };
