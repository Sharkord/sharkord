import type { IRootState } from '@/features/store';
import type { TConversationKey } from '@/types';
import { createCachedSelector } from 're-reselect';
import { getConversationKey } from '../helpers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DEFAULT_ARRAY: any[] = [];

export const messagesMapSelector = (state: IRootState) =>
  state.server.messagesMap;

export const typingMapSelector = (state: IRootState) => state.server.typingMap;

export const messagesByConversationKeySelector = (
  state: IRootState,
  conversationKey: TConversationKey
) => state.server.messagesMap[conversationKey] || DEFAULT_ARRAY;

export const messagesByChannelIdSelector = (
  state: IRootState,
  channelId: number
) =>
  messagesByConversationKeySelector(state, getConversationKey({ channelId }));

export const parentMessageByIdSelector = createCachedSelector(
  [
    (state: IRootState, _messageId: number, channelId: number) =>
      messagesByChannelIdSelector(state, channelId),
    (_: IRootState, messageId: number) => messageId
  ],
  (messages, messageId) => messages.find((m) => m.id === messageId)
)((_, messageId: number) => messageId);

export const isConversationDetachedSelector = (
  state: IRootState,
  conversationKey: TConversationKey
) => !!state.server.detachedConversations[conversationKey];
