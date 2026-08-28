import type { IRootState } from '@/features/store';
import { useSelector } from 'react-redux';
import {
  channelByIdSelector,
  channelIdsByCategorySelector,
  channelPermissionsByIdSelector,
  channelsByCategoryIdSelector,
  channelsMapSelector,
  channelsSelector,
  currentVoiceChannelIdSelector,
  directMessagesUnreadCountSelector,
  isCurrentVoiceChannelSelectedSelector,
  selectedChannelIdSelector,
  selectedChannelTypeSelector
} from './selectors';

export const useChannels = () =>
  useSelector((state: IRootState) => channelsSelector(state));

export const useChannelById = (channelId: number) =>
  useSelector((state: IRootState) => channelByIdSelector(state, channelId));

export const useChannelsByCategoryId = (categoryId: number) =>
  useSelector((state: IRootState) =>
    channelsByCategoryIdSelector(state, categoryId)
  );

export const useChannelIdsByCategory = () =>
  useSelector(channelIdsByCategorySelector);

export const useSelectedChannelId = () =>
  useSelector(selectedChannelIdSelector);

export const useCurrentVoiceChannelId = () =>
  useSelector(currentVoiceChannelIdSelector);

export const useIsCurrentVoiceChannelSelected = () =>
  useSelector(isCurrentVoiceChannelSelectedSelector);

export const useChannelPermissionsById = (channelId: number) =>
  useSelector((state: IRootState) =>
    channelPermissionsByIdSelector(state, channelId)
  );

export const useSelectedChannelType = () =>
  useSelector(selectedChannelTypeSelector);

export const useChannelsMap = () => useSelector(channelsMapSelector);

export const useDirectMessagesUnreadCount = () =>
  useSelector(directMessagesUnreadCountSelector);
