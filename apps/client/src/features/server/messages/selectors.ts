import type { IRootState } from '@/features/store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DEFAULT_ARRAY: any[] = [];

export const messagesMapSelector = (state: IRootState) =>
  state.server.messagesMap;

export const typingMapSelector = (state: IRootState) => state.server.typingMap;

export const messagesByChannelIdSelector = (
  state: IRootState,
  channelId: number
) => state.server.messagesMap[channelId] || DEFAULT_ARRAY;
