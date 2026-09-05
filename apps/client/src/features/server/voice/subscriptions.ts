import { store } from '@/features/store';
import { logDebug } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import { currentVoiceChannelIdSelector } from '../channels/selectors';
import { handleSubscriptionError } from '../subscription-error';
import {
  addExternalStreamToVoiceChannel,
  addUserToVoiceChannel,
  removeExternalStreamFromVoiceChannel,
  removeUserFromVoiceChannel,
  setVoiceMoveTargetChannelId,
  showVoiceReaction,
  updateExternalStreamInVoiceChannel,
  updateVoiceUserState
} from './actions';

const subscribeToVoice = () => {
  const trpc = getTRPCClient();

  const onUserJoinVoiceSub = trpc.voice.onJoin.subscribe(undefined, {
    onData: ({ channelId, userId, state }) => {
      logDebug('[EVENTS] voice.onJoin', { channelId, userId, state });
      addUserToVoiceChannel(userId, channelId, state);
    },
    onError: handleSubscriptionError('onUserJoinVoice')
  });

  const onUserLeaveVoiceSub = trpc.voice.onLeave.subscribe(undefined, {
    onData: ({ channelId, userId }) => {
      logDebug('[EVENTS] voice.onLeave', { channelId, userId });
      removeUserFromVoiceChannel(userId, channelId);
    },
    onError: handleSubscriptionError('onUserLeaveVoice')
  });

  const onUserUpdateVoiceSub = trpc.voice.onUpdateState.subscribe(undefined, {
    onData: ({ channelId, userId, state }) => {
      logDebug('[EVENTS] voice.onUpdateState', { channelId, userId, state });
      updateVoiceUserState(userId, channelId, state);
    },
    onError: handleSubscriptionError('onUserUpdateVoice')
  });

  const onVoiceAddExternalStreamSub = trpc.voice.onAddExternalStream.subscribe(
    undefined,
    {
      onData: ({ channelId, streamId, stream }) => {
        logDebug('[EVENTS] voice.onAddExternalStream', {
          channelId,
          streamId,
          stream
        });
        addExternalStreamToVoiceChannel(channelId, streamId, stream);
      },
      onError: handleSubscriptionError('onVoiceAddExternalStreamSub')
    }
  );

  const onVoiceUpdateExternalStreamSub =
    trpc.voice.onUpdateExternalStream.subscribe(undefined, {
      onData: ({ channelId, streamId, stream }) => {
        logDebug('[EVENTS] voice.onUpdateExternalStream', {
          channelId,
          streamId,
          stream
        });
        updateExternalStreamInVoiceChannel(channelId, streamId, stream);
      },
      onError: handleSubscriptionError('onVoiceUpdateExternalStreamSub')
    });

  const onVoiceRemoveExternalStreamSub =
    trpc.voice.onRemoveExternalStream.subscribe(undefined, {
      onData: ({ channelId, streamId }) => {
        logDebug('[EVENTS] voice.onRemoveExternalStream', {
          channelId,
          streamId
        });
        removeExternalStreamFromVoiceChannel(channelId, streamId);
      },
      onError: handleSubscriptionError('onVoiceRemoveExternalStreamSub')
    });

  const onReactionSub = trpc.voice.onReaction.subscribe(undefined, {
    onData: ({ channelId, userId, emoji }) => {
      logDebug('[EVENTS] voice.onReaction', { channelId, userId, emoji });
      showVoiceReaction(userId, emoji);
    },
    onError: handleSubscriptionError('onVoiceReaction')
  });

  const onMovedSub = trpc.voice.onMoved.subscribe(undefined, {
    onData: ({ channelId, fromChannelId }) => {
      logDebug('[EVENTS] voice.onMoved', { channelId, fromChannelId });

      const state = store.getState();
      const currentVoiceChannelId = currentVoiceChannelIdSelector(state);

      if (currentVoiceChannelId !== fromChannelId) return;

      setVoiceMoveTargetChannelId(channelId);
    },
    onError: handleSubscriptionError('onMoved')
  });

  return () => {
    onUserJoinVoiceSub.unsubscribe();
    onUserLeaveVoiceSub.unsubscribe();
    onUserUpdateVoiceSub.unsubscribe();
    onVoiceAddExternalStreamSub.unsubscribe();
    onVoiceUpdateExternalStreamSub.unsubscribe();
    onVoiceRemoveExternalStreamSub.unsubscribe();
    onReactionSub.unsubscribe();
    onMovedSub.unsubscribe();
  };
};

export { subscribeToVoice };
