import type { IRootState } from '@/features/store';
import { useSelector } from 'react-redux';
import {
  channelByIdSelector,
  channelsByCategoryIdSelector,
  channelsSelector,
  currentVoiceChannelIdSelector,
  isCurrentVoiceChannelSelectedSelector,
  selectedChannelIdSelector,
  selectedChannelSelector
} from './selectors';

export const useChannels = () =>
  useSelector((state: IRootState) => channelsSelector(state));

export const useChannelById = (channelId: number) =>
  useSelector((state: IRootState) => channelByIdSelector(state, channelId));

export const useChannelsByCategoryId = (categoryId: number) =>
  useSelector((state: IRootState) =>
    channelsByCategoryIdSelector(state, categoryId)
  );

export const useSelectedChannelId = () =>
  useSelector(selectedChannelIdSelector);

export const useSelectedChannel = () => useSelector(selectedChannelSelector);

export const useCurrentVoiceChannelId = () =>
  useSelector(currentVoiceChannelIdSelector);

export const useIsCurrentVoiceChannelSelected = () =>
  useSelector(isCurrentVoiceChannelSelectedSelector);
