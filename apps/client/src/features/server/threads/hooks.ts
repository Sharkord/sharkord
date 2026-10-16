import type { IRootState } from '@/features/store';
import { useSelector } from 'react-redux';
import {
  followedThreadsCursorSelector,
  followedThreadsListSelector,
  followedThreadsReadStateSelector,
  isThreadFollowedSelector,
  threadReadStateSelector,
  threadsOpenSelector
} from './selectors';

export const useThreadsOpen = () => useSelector(threadsOpenSelector);

export const useIsThreadFollowed = (parentMessageId: number) =>
  useSelector((state: IRootState) =>
    isThreadFollowedSelector(state, parentMessageId)
  );

export const useThreadReadState = (parentMessageId: number) =>
  useSelector((state: IRootState) =>
    threadReadStateSelector(state, parentMessageId)
  );

export const useFollowedThreadsList = () =>
  useSelector(followedThreadsListSelector);

export const useFollowedThreadsCursor = () =>
  useSelector(followedThreadsCursorSelector);

export const useFollowedThreadsReadState = () =>
  useSelector(followedThreadsReadStateSelector);
