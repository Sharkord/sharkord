import { VoiceProviderContext } from '@/components/voice-provider';
import type { IRootState } from '@/features/store';
import { useContext } from 'react';
import { useSelector } from 'react-redux';
import {
  ownVoiceStateSelector,
  pinnedCardSelector,
  voiceChannelStateSelector
} from './selectors';

export const useVoiceChannelState = (channelId: number) =>
  useSelector((state: IRootState) =>
    voiceChannelStateSelector(state, channelId)
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
