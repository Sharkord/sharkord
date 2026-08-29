import type { IRootState } from '@/features/store';
import { createCachedSelector } from 're-reselect';

const DEFAULT_OBJECT = {};

export const ownVoiceStateSelector = (state: IRootState) => {
  return state.server.ownVoiceState;
};

export const pinnedCardSelector = (state: IRootState) =>
  state.server.pinnedCard;

export const voiceMoveTargetChannelIdSelector = (state: IRootState) =>
  state.server.voiceMoveTargetChannelId;

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

export const voiceReactionSelector = (state: IRootState, userId: number) =>
  state.server.voiceReactions[userId];

export const hideNonVideoParticipantsSelector = (state: IRootState) =>
  state.server.hideNonVideoParticipants;

export const showUserBannersInVoiceSelector = (state: IRootState) =>
  state.server.showUserBannersInVoice;

export const hideOwnScreenShareSelector = (state: IRootState) =>
  state.server.hideOwnScreenShare;

export const alwaysShowVoiceControlsSelector = (state: IRootState) =>
  state.server.alwaysShowVoiceControls;
