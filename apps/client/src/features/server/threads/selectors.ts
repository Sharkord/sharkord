import type { IRootState } from '@/features/store';
import { createSelector } from '@reduxjs/toolkit';
import type { TThreadReadState } from '@sharkord/shared';

const NO_UNREAD: TThreadReadState = { unreadCount: 0, hasUnreadMention: false };

export const followedThreadsSelector = (state: IRootState) =>
  state.server.followedThreads;

export const threadsOpenSelector = (state: IRootState) =>
  state.server.threadsOpen;

export const followedThreadsListSelector = (state: IRootState) =>
  state.server.followedThreadsList;

export const followedThreadsCursorSelector = (state: IRootState) =>
  state.server.followedThreadsCursor;

export const isThreadFollowedSelector = (
  state: IRootState,
  parentMessageId: number
) => parentMessageId in state.server.followedThreads;

export const threadReadStateSelector = (
  state: IRootState,
  parentMessageId: number
) => state.server.followedThreads[parentMessageId] ?? NO_UNREAD;

export const followedThreadsReadStateSelector = createSelector(
  [followedThreadsSelector],
  (followedThreads): TThreadReadState => {
    const readStates = Object.values(followedThreads);

    return {
      unreadCount: readStates.reduce(
        (total, { unreadCount }) => total + unreadCount,
        0
      ),
      hasUnreadMention: readStates.some(
        ({ hasUnreadMention }) => hasUnreadMention
      )
    };
  }
);
