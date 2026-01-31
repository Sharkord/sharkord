import { getTRPCClient } from '@/lib/trpc';
import { type TPublicServerSettings } from '@sharkord/shared';
import { setPublicServerSettings } from './actions';
import { subscribeToCategories } from './categories/subscriptions';
import { subscribeToChannels } from './channels/subscriptions';
import { subscribeToEmojis } from './emojis/subscriptions';
import { subscribeToMessages } from './messages/subscriptions';
import { subscribeToPlugins } from './plugins/subscriptions';
import { subscribeToRoles } from './roles/subscriptions';
import { subscribeToUsers } from './users/subscriptions';
import { subscribeToVoice } from './voice/subscriptions';

const subscribeToServer = () => {
  const trpc = getTRPCClient();

  const onSettingsUpdateSub = trpc.others.onServerSettingsUpdate.subscribe(
    undefined,
    {
      onData: (settings: TPublicServerSettings) =>
        setPublicServerSettings(settings),
      onError: (err) =>
        console.error('onSettingsUpdate subscription error:', err)
    }
  );

  return () => {
    onSettingsUpdateSub.unsubscribe();
  };
};

const initSubscriptions = () => {
  const subscriptors = [
    subscribeToChannels,
    subscribeToServer,
    subscribeToEmojis,
    subscribeToRoles,
    subscribeToUsers,
    subscribeToMessages,
    subscribeToVoice,
    subscribeToCategories,
    subscribeToPlugins
  ];

  const unsubscribes = subscriptors.map((subscriptor) => subscriptor());

  return () => {
    unsubscribes.forEach((unsubscribe) => unsubscribe());
  };
};

export { initSubscriptions };
