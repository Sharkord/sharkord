import { getTRPCClient } from '@/lib/trpc';
import {
  addExternalStreamToVoiceChannel,
  addUserToVoiceChannel,
  removeExternalStreamFromVoiceChannel,
  removeUserFromVoiceChannel,
  updateVoiceChannelState,
  updateExternalStreamInVoiceChannel,
  updateVoiceUserState
} from './actions';

const subscribeToVoice = () => {
  const trpc = getTRPCClient();

  const onUserJoinVoiceSub = trpc.voice.onJoin.subscribe(undefined, {
    onData: ({ channelId, userId, state }) => {
      addUserToVoiceChannel(userId, channelId, state);
    },
    onError: (err) => console.error('onUserJoinVoice subscription error:', err)
  });

  const onUserLeaveVoiceSub = trpc.voice.onLeave.subscribe(undefined, {
    onData: ({ channelId, userId }) => {
      removeUserFromVoiceChannel(userId, channelId);
    },
    onError: (err) => console.error('onUserLeaveVoice subscription error:', err)
  });

  const onUserUpdateVoiceSub = trpc.voice.onUpdateState.subscribe(undefined, {
    onData: ({ channelId, userId, state }) => {
      updateVoiceUserState(userId, channelId, state);
    },
    onError: (err) =>
      console.error('onUserUpdateVoice subscription error:', err)
  });

  const onVoiceChannelStateSub = trpc.voice.onChannelState.subscribe(
    undefined,
    {
      onData: ({ channelId, activeSince }) => {
        updateVoiceChannelState(channelId, activeSince);
      },
      onError: (err) =>
        console.error('onVoiceChannelStateSub subscription error:', err)
    }
  );

  const onVoiceAddExternalStreamSub = trpc.voice.onAddExternalStream.subscribe(
    undefined,
    {
      onData: ({ channelId, streamId, stream }) => {
        addExternalStreamToVoiceChannel(channelId, streamId, stream);
      },
      onError: (err) =>
        console.error('onVoiceAddExternalStreamSub subscription error:', err)
    }
  );

  const onVoiceUpdateExternalStreamSub =
    trpc.voice.onUpdateExternalStream.subscribe(undefined, {
      onData: ({ channelId, streamId, stream }) => {
        updateExternalStreamInVoiceChannel(channelId, streamId, stream);
      },
      onError: (err) =>
        console.error('onVoiceUpdateExternalStreamSub subscription error:', err)
    });

  const onVoiceRemoveExternalStreamSub =
    trpc.voice.onRemoveExternalStream.subscribe(undefined, {
      onData: ({ channelId, streamId }) => {
        removeExternalStreamFromVoiceChannel(channelId, streamId);
      },
      onError: (err) =>
        console.error('onVoiceRemoveExternalStreamSub subscription error:', err)
    });

  return () => {
    onUserJoinVoiceSub.unsubscribe();
    onUserLeaveVoiceSub.unsubscribe();
    onUserUpdateVoiceSub.unsubscribe();
    onVoiceChannelStateSub.unsubscribe();
    onVoiceAddExternalStreamSub.unsubscribe();
    onVoiceUpdateExternalStreamSub.unsubscribe();
    onVoiceRemoveExternalStreamSub.unsubscribe();
  };
};

export { subscribeToVoice };
