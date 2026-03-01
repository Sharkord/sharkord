import type { IRootState } from '@/features/store';
import { createSelector } from '@reduxjs/toolkit';
import type { TChannel } from '@sharkord/shared';
import { createCachedSelector } from 're-reselect';

const DEFAULT_OBJECT = {};

export const channelsSelector = (state: IRootState) => state.server.channels;

export const selectedChannelIdSelector = (state: IRootState) =>
  state.server.selectedChannelId;

export const selectedChannelTypeSelector = createSelector(
  [channelsSelector, selectedChannelIdSelector],
  (channels, selectedChannelId) =>
    channels.find((channel) => channel.id === selectedChannelId)?.type
);

export const currentVoiceChannelIdSelector = (state: IRootState) =>
  state.server.currentVoiceChannelId;

export const channelPermissionsSelector = (state: IRootState) =>
  state.server.channelPermissions;

export const channelsReadStatesSelector = (state: IRootState) =>
  state.server.readStatesMap;

export const channelReadStateByIdSelector = (
  state: IRootState,
  channelId: number
) => state.server.readStatesMap[channelId] ?? 0;

export const channelByIdSelector = createCachedSelector(
  [channelsSelector, (_: IRootState, channelId: number) => channelId],
  (channels, channelId) => channels.find((channel) => channel.id === channelId)
)((_, channelId: number) => channelId);

export const channelsByCategoryIdSelector = createCachedSelector(
  [channelsSelector, (_: IRootState, categoryId: number) => categoryId],
  (channels, categoryId) =>
    channels
      .filter((channel) => channel.categoryId === categoryId)
      .sort((a, b) => a.position - b.position)
)((_, categoryId: number) => categoryId);

export const selectedChannelSelector = createSelector(
  [channelsSelector, selectedChannelIdSelector],
  (channels, selectedChannelId) =>
    channels.find((channel) => channel.id === selectedChannelId)
);

export const isCurrentVoiceChannelSelectedSelector = createSelector(
  [selectedChannelIdSelector, currentVoiceChannelIdSelector],
  (selectedChannelId, currentVoiceChannelId) =>
    currentVoiceChannelId !== undefined &&
    selectedChannelId === currentVoiceChannelId
);

export const channelPermissionsByIdSelector = (
  state: IRootState,
  channelId: number
) => state.server.channelPermissions[channelId] || DEFAULT_OBJECT;

export const channelsMapSelector = createSelector(
  channelsSelector,
  (channels) => {
    const map: Record<number, TChannel> = {};

    channels.forEach((channel) => {
      map[channel.id] = channel;
    });

    return map;
  }
);

export const channelIdsSelector = createSelector(channelsSelector, (channels) =>
  channels.map((channel) => channel.id)
);

export const directMessagesUnreadCountSelector = createSelector(
  [channelsSelector, channelsReadStatesSelector],
  (channels, readStates) => {
    return channels
      .filter((channel) => channel.isDm)
      .reduce((acc, channel) => acc + (readStates[channel.id] ?? 0), 0);
  }
);
