import type { IRootState } from '@/features/store';
import { createSelector } from '@reduxjs/toolkit';

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
