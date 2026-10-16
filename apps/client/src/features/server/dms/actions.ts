import { store } from '@/features/store';
import type { TDirectMessageConversation } from '@sharkord/shared';
import { serverSliceActions } from '../slice';

export const upsertDirectMessage = (
  conversation: TDirectMessageConversation
) => {
  store.dispatch(serverSliceActions.upsertDirectMessage(conversation));
};

export const setDirectMessageActivity = (
  channelId: number,
  lastMessageAt: number
) => {
  store.dispatch(
    serverSliceActions.setDirectMessageActivity({ channelId, lastMessageAt })
  );
};
