import { getTRPCClient } from '@/lib/trpc';
import {
  addUserToVoiceChannel,
  removeUserFromVoiceChannel,
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

  return () => {
    onUserJoinVoiceSub.unsubscribe();
    onUserLeaveVoiceSub.unsubscribe();
    onUserUpdateVoiceSub.unsubscribe();
  };
};

export { subscribeToVoice };
