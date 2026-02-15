import { VoiceProviderContext } from '@/components/voice-provider';
import type { IRootState } from '@/features/store';
import { useContext } from 'react';
import { useSelector } from 'react-redux';
import {
  hideNonVideoParticipantsSelector,
  ownVoiceStateSelector,
  pinnedCardSelector,
  voiceChannelAudioExternalStreamsSelector,
  voiceChannelExternalStreamsListSelector,
  voiceChannelExternalStreamsSelector,
  voiceChannelStateSelector,
  voiceChannelVideoExternalStreamsSelector
} from './selectors';

export const useVoiceChannelState = (channelId: number) =>
  useSelector((state: IRootState) =>
    voiceChannelStateSelector(state, channelId)
  );

export const useVoiceChannelExternalStreams = (channelId: number) =>
  useSelector((state: IRootState) =>
    voiceChannelExternalStreamsSelector(state, channelId)
  );

export const useVoiceChannelExternalStreamsList = (channelId: number) =>
  useSelector((state: IRootState) =>
    voiceChannelExternalStreamsListSelector(state, channelId)
  );

export const useVoiceChannelAudioExternalStreams = (channelId: number) =>
  useSelector((state: IRootState) =>
    voiceChannelAudioExternalStreamsSelector(state, channelId)
  );

export const useVoiceChannelVideoExternalStreams = (channelId: number) =>
  useSelector((state: IRootState) =>
    voiceChannelVideoExternalStreamsSelector(state, channelId)
  );

export const useVoice = () => {
  const context = useContext(VoiceProviderContext);

  if (!context) {
    throw new Error(
      'useVoice must be used within a MediasoupProvider component'
    );
  }

  return context;
};

export const useOwnVoiceState = () => useSelector(ownVoiceStateSelector);

export const usePinnedCard = () => useSelector(pinnedCardSelector);

export const useHideNonVideoParticipants = () =>
  useSelector(hideNonVideoParticipantsSelector);
