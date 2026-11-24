import { store } from '@/features/store';
import { getTRPCClient } from '@/lib/trpc';
import type {
  TFollowedThread,
  TMessagesCursor,
  TThreadFollowUpdate,
  TThreadReadState
} from '@sharkord/shared';
import { serverSliceActions } from '../slice';
import { threadReadStateSelector } from './selectors';

export const applyThreadFollowUpdate = (update: TThreadFollowUpdate) => {
  store.dispatch(serverSliceActions.applyThreadFollowUpdate(update));
};

export const setFollowedThreadsPage = (
  threads: TFollowedThread[],
  nextCursor: TMessagesCursor | null,
  append: boolean
) => {
  store.dispatch(
    serverSliceActions.setFollowedThreadsPage({ threads, nextCursor, append })
  );
};

export const setThreadsOpen = (open: boolean) => {
  store.dispatch(serverSliceActions.setThreadsOpen(open));
};

const setThreadReadState = (
  parentMessageId: number,
  readState: TThreadReadState
) => {
  store.dispatch(
    serverSliceActions.setThreadReadState({ parentMessageId, ...readState })
  );
};

export const markThreadAsRead = async (parentMessageId: number) => {
  const state = store.getState();
  const readState = threadReadStateSelector(state, parentMessageId);

  if (readState.unreadCount === 0) return;

  setThreadReadState(parentMessageId, {
    unreadCount: 0,
    hasUnreadMention: false
  });

  try {
    const trpc = getTRPCClient();

    await trpc.threads.markAsRead.mutate({ parentMessageId });
  } catch {
    setThreadReadState(parentMessageId, readState);
  }
};
