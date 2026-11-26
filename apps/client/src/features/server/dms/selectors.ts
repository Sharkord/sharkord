import type { IRootState } from '@/features/store';
import { createSelector } from '@reduxjs/toolkit';
import { createCachedSelector } from 're-reselect';

export const directMessagesSelector = (state: IRootState) =>
  state.server.directMessages;

export const visibleDirectMessagesSelector = createSelector(
  [directMessagesSelector],
  (conversations) =>
    conversations.filter(
      ({ closedAt, lastMessageAt }) =>
        closedAt === null || lastMessageAt > closedAt
    )
);

export const directMessageByChannelIdSelector = createCachedSelector(
  [directMessagesSelector, (_: IRootState, channelId: number) => channelId],
  (directMessages, channelId) =>
    directMessages.find((dm) => dm.channelId === channelId)
)((_, channelId: number) => channelId);
