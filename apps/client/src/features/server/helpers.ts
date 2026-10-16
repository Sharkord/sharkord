import type { TConversation, TConversationKey } from '@/types';
import {
  ChannelPermission,
  hasMention,
  type TDirectMessageConversation,
  type TFollowedThread,
  type TJoinedMessage
} from '@sharkord/shared';
import type { channelPermissionsSelector } from './channels/selectors';

const canViewChannel = (
  channel: { id: number; private: boolean },
  channelPermissions: ReturnType<typeof channelPermissionsSelector>,
  isOwner: boolean,
  currentVoiceChannelId?: number
) => {
  if (isOwner || !channel.private) {
    return true;
  }

  if (channel.id === currentVoiceChannelId) {
    return true;
  }

  return (
    channelPermissions[channel.id]?.permissions?.[
      ChannelPermission.VIEW_CHANNEL
    ] === true
  );
};

const hasUnreadMentionInMessages = (
  unreadCount: number,
  messages: { content?: string | null }[],
  ownUserId: number | undefined,
  ownRoleIds: number[]
) => {
  if (unreadCount <= 0 || messages.length === 0 || ownUserId === undefined) {
    return false;
  }

  const unreadMessages = messages.slice(-unreadCount);

  return unreadMessages.some((message) => {
    if (!message.content) return false;

    return hasMention(message.content, ownUserId, ownRoleIds);
  });
};

const compareMessagesByDate = (a: TJoinedMessage, b: TJoinedMessage) => {
  const createdAtDifference = a.createdAt - b.createdAt;

  if (createdAtDifference !== 0) {
    return createdAtDifference;
  }

  return a.id - b.id;
};

const mergeMessagesChronologically = (
  existing: TJoinedMessage[],
  incoming: TJoinedMessage[]
) => {
  if (incoming.length === 0) {
    return existing;
  }

  const sortedIncoming = [...incoming].sort(compareMessagesByDate);

  if (existing.length === 0) {
    return sortedIncoming;
  }

  const firstExisting = existing[0];
  const lastExisting = existing[existing.length - 1];
  const firstIncoming = sortedIncoming[0];
  const lastIncoming = sortedIncoming[sortedIncoming.length - 1];

  if (compareMessagesByDate(lastExisting, firstIncoming) <= 0) {
    return [...existing, ...sortedIncoming];
  }

  if (compareMessagesByDate(lastIncoming, firstExisting) <= 0) {
    return [...sortedIncoming, ...existing];
  }

  const merged: TJoinedMessage[] = [];
  let existingIndex = 0;
  let incomingIndex = 0;

  while (
    existingIndex < existing.length &&
    incomingIndex < sortedIncoming.length
  ) {
    if (
      compareMessagesByDate(
        existing[existingIndex],
        sortedIncoming[incomingIndex]
      ) <= 0
    ) {
      merged.push(existing[existingIndex]);
      existingIndex += 1;
    } else {
      merged.push(sortedIncoming[incomingIndex]);
      incomingIndex += 1;
    }
  }

  if (existingIndex < existing.length) {
    merged.push(...existing.slice(existingIndex));
  }

  if (incomingIndex < sortedIncoming.length) {
    merged.push(...sortedIncoming.slice(incomingIndex));
  }

  return merged;
};

const getConversationKey = ({
  channelId,
  parentMessageId
}: TConversation): TConversationKey =>
  parentMessageId ? `thread:${parentMessageId}` : `channel:${channelId}`;

const getMessageConversation = (
  message: Pick<TJoinedMessage, 'channelId' | 'parentMessageId'>
): TConversation => ({
  channelId: message.channelId,
  parentMessageId: message.parentMessageId ?? undefined
});

const compareFollowedThreads = (a: TFollowedThread, b: TFollowedThread) =>
  b.lastReplyAt - a.lastReplyAt || b.parentMessageId - a.parentMessageId;

const upsertFollowedThread = (
  threads: TFollowedThread[],
  parentMessageId: number,
  thread: TFollowedThread | null,
  hasMorePages: boolean
) => {
  const remaining = threads.filter(
    (other) => other.parentMessageId !== parentMessageId
  );

  if (!thread) return remaining;

  const index = remaining.findIndex(
    (other) => compareFollowedThreads(thread, other) < 0
  );

  if (index === -1) {
    return hasMorePages ? remaining : [...remaining, thread];
  }

  return [...remaining.slice(0, index), thread, ...remaining.slice(index)];
};

const upsertDirectMessage = (
  conversations: TDirectMessageConversation[],
  conversation: TDirectMessageConversation
) => {
  const remaining = conversations.filter(
    (other) => other.channelId !== conversation.channelId
  );

  const index = remaining.findIndex(
    (other) => other.lastMessageAt <= conversation.lastMessageAt
  );

  if (index === -1) return [...remaining, conversation];

  return [
    ...remaining.slice(0, index),
    conversation,
    ...remaining.slice(index)
  ];
};

export {
  canViewChannel,
  getConversationKey,
  getMessageConversation,
  hasUnreadMentionInMessages,
  mergeMessagesChronologically,
  upsertDirectMessage,
  upsertFollowedThread
};
