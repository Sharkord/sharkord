import { getTRPCClient } from '@/lib/trpc';
import { type TSettings } from '@sharkord/shared';
import { setPublicServerSettings } from './actions';
import { subscribeToCategories } from './categories/subscriptions';
import { subscribeToChannels } from './channels/subscriptions';
import { subscribeToEmojis } from './emojis/subscriptions';
import { subscribeToMessages } from './messages/subscriptions';
import { subscribeToRoles } from './roles/subscriptions';
import { subscribeToUsers } from './users/subscriptions';
import { subscribeToVoice } from './voice/subscriptions';

const subscribeToServer = () => {
  const trpc = getTRPCClient();

  const onSettingsUpdateSub = trpc.others.onServerSettingsUpdate.subscribe(
    undefined,
    {
      onData: (settings: TSettings) =>
        setPublicServerSettings({
          name: settings.name,
          description: settings.description ?? '',
          serverId: settings.serverId ?? '',
          storageUploadEnabled: settings.storageUploadEnabled,
          storageQuota: settings.storageQuota,
          storageUploadMaxFileSize: settings.storageUploadMaxFileSize,
          storageSpaceQuotaByUser: settings.storageSpaceQuotaByUser,
          storageOverflowAction: settings.storageOverflowAction
        }),
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
    subscribeToCategories
  ];

  const unsubscribes = subscriptors.map((subscriptor) => subscriptor());

  return () => {
    unsubscribes.forEach((unsubscribe) => unsubscribe());
  };
};

export { initSubscriptions };
