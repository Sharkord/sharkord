import { logDebug } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import { handleSubscriptionError } from '../subscription-error';
import {
  addChannel,
  removeChannel,
  setChannelPermissions,
  setChannelReadState,
  updateChannel
} from './actions';

const subscribeToChannels = () => {
  const trpc = getTRPCClient();

  const onChannelCreateSub = trpc.channels.onCreate.subscribe(undefined, {
    onData: (channel) => {
      logDebug('[EVENTS] channels.onCreate', { channel });
      addChannel(channel);
    },
    onError: handleSubscriptionError('onChannelCreate')
  });

  const onChannelDeleteSub = trpc.channels.onDelete.subscribe(undefined, {
    onData: (channelId) => {
      logDebug('[EVENTS] channels.onDelete', { channelId });
      removeChannel(channelId);
    },
    onError: handleSubscriptionError('onChannelDelete')
  });

  const onChannelUpdateSub = trpc.channels.onUpdate.subscribe(undefined, {
    onData: (channel) => {
      logDebug('[EVENTS] channels.onUpdate', { channel });
      updateChannel(channel.id, channel);
    },
    onError: handleSubscriptionError('onChannelUpdate')
  });

  const onChannelPermissionsUpdateSub =
    trpc.channels.onPermissionsUpdate.subscribe(undefined, {
      onData: (data) => {
        logDebug('[EVENTS] channels.onPermissionsUpdate', { data });
        setChannelPermissions(data);
      },
      onError: handleSubscriptionError('onChannelPermissionsUpdate')
    });

  const onChannelReadStatesUpdateSub =
    trpc.channels.onReadStateUpdate.subscribe(undefined, {
      onData: (data) => {
        logDebug('[EVENTS] channels.onReadStateUpdate', { data });
        setChannelReadState(data.channelId, data);
      },
      onError: handleSubscriptionError('onChannelReadStatesUpdate')
    });

  const onChannelReadStatesDeltaSub = trpc.channels.onReadStateDelta.subscribe(
    undefined,
    {
      onData: (data) => {
        logDebug('[EVENTS] channels.onReadStateDelta', { data });
        setChannelReadState(data.channelId, data);
      },
      onError: handleSubscriptionError('onChannelReadStatesDelta')
    }
  );

  return () => {
    onChannelCreateSub.unsubscribe();
    onChannelDeleteSub.unsubscribe();
    onChannelUpdateSub.unsubscribe();
    onChannelPermissionsUpdateSub.unsubscribe();
    onChannelReadStatesUpdateSub.unsubscribe();
    onChannelReadStatesDeltaSub.unsubscribe();
  };
};

export { subscribeToChannels };
