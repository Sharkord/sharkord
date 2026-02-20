import type { IRootState } from '@/features/store';
import { createCachedSelector } from 're-reselect';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DEFAULT_ARRAY: any[] = [];

export const messagesMapSelector = (state: IRootState) =>
  state.server.messagesMap;

export const typingMapSelector = (state: IRootState) => state.server.typingMap;

export const messagesByChannelIdSelector = (
  state: IRootState,
  channelId: number
) => state.server.messagesMap[channelId] || DEFAULT_ARRAY;

export const threadMessagesMapSelector = (state: IRootState) =>
  state.server.threadMessagesMap;

export const threadMessagesByParentIdSelector = (
  state: IRootState,
  parentMessageId: number
) => state.server.threadMessagesMap[parentMessageId] || DEFAULT_ARRAY;

export const threadTypingMapSelector = (state: IRootState) =>
  state.server.threadTypingMap;

export const parentMessageByIdSelector = createCachedSelector(
  [
    (state: IRootState, _messageId: number, channelId: number) =>
      messagesByChannelIdSelector(state, channelId),
    (_: IRootState, messageId: number) => messageId
  ],
  (messages, messageId) => messages.find((m) => m.id === messageId)
)((_, messageId: number) => messageId);
