import type { IRootState } from '@/features/store';
import { useSelector } from 'react-redux';
import {
  directMessageByChannelIdSelector,
  visibleDirectMessagesSelector
} from './selectors';

export const useVisibleDirectMessages = () =>
  useSelector(visibleDirectMessagesSelector);

export const useDirectMessageByChannelId = (channelId: number) =>
  useSelector((state: IRootState) =>
    directMessageByChannelIdSelector(state, channelId)
  );
