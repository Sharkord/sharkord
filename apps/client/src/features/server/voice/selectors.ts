import type { IRootState } from '@/features/store';
import { createCachedSelector } from 're-reselect';

const DEFAULT_OBJECT = {};

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

export const voiceChannelExternalStreamsSelector = (
  state: IRootState,
  channelId: number
) => state.server.externalStreamsMap[channelId];

export const voiceChannelExternalStreamsListSelector = createCachedSelector(
  voiceChannelExternalStreamsSelector,
  (externalStreamsMap) => {
    return Object.entries(externalStreamsMap || DEFAULT_OBJECT).map(
      ([streamId, stream]) => ({
        streamId: Number(streamId),
        ...stream
      })
    );
  }
)((_state: IRootState, channelId: number) => channelId);

export const voiceChannelAudioExternalStreamsSelector = createCachedSelector(
  voiceChannelExternalStreamsListSelector,
  (externalStreams) =>
    externalStreams.filter((stream) => stream.tracks?.audio === true)
)((_state: IRootState, channelId: number) => channelId);

export const voiceChannelVideoExternalStreamsSelector = createCachedSelector(
  voiceChannelExternalStreamsListSelector,
  (externalStreams) =>
    externalStreams.filter((stream) => stream.tracks?.video === true)
)((_state: IRootState, channelId: number) => channelId);

export const hideNonVideoParticipantsSelector = (state: IRootState) =>
  state.server.hideNonVideoParticipants;
