import type { IRootState } from '@/features/store';
import { createSelector } from '@reduxjs/toolkit';

export const channelsSelector = (state: IRootState) => state.server.channels;

export const channelByIdSelector = createSelector(
  [channelsSelector, (_, channelId: number) => channelId],
  (channels, channelId) => channels.find((channel) => channel.id === channelId)
);

export const channelsByCategoryIdSelector = createSelector(
  [channelsSelector, (_, categoryId: number) => categoryId],
  (channels, categoryId) =>
    channels
      .filter((channel) => channel.categoryId === categoryId)
      .sort((a, b) => a.position - b.position)
);

export const selectedChannelIdSelector = (state: IRootState) =>
  state.server.selectedChannelId;

export const selectedChannelSelector = createSelector(
  [channelsSelector, selectedChannelIdSelector],
  (channels, selectedChannelId) =>
    channels.find((channel) => channel.id === selectedChannelId)
);

export const currentVoiceChannelIdSelector = (state: IRootState) =>
  state.server.currentVoiceChannelId;

export const isCurrentVoiceChannelSelectedSelector = createSelector(
  [selectedChannelIdSelector, currentVoiceChannelIdSelector],
  (selectedChannelId, currentVoiceChannelId) =>
    currentVoiceChannelId !== undefined &&
    selectedChannelId === currentVoiceChannelId
);
