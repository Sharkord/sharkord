import type { IRootState } from '@/features/store';

export const voiceMapSelector = (state: IRootState) => state.server.voiceMap;

export const ownVoiceStateSelector = (state: IRootState) => {
  return state.server.ownVoiceState;
};

export const pinnedCardSelector = (state: IRootState) =>
  state.server.pinnedCard;

export const voiceChannelStateSelector = (
  state: IRootState,
  channelId: number
) => state.server.voiceMap[channelId];
