import {
  ChannelPermission,
  hasMention,
  type TJoinedMessage
} from '@sharkord/shared';
import type { channelPermissionsSelector } from './channels/selectors';

const canViewChannel = (
  channel: { id: number; private: boolean },
  channelPermissions: ReturnType<typeof channelPermissionsSelector>,
  isOwner: boolean
) => {
  if (isOwner || !channel.private) {
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
  ownUserId: number | undefined
) => {
  if (unreadCount <= 0 || messages.length === 0 || ownUserId === undefined) {
    return false;
  }

  const unreadMessages = messages.slice(-unreadCount);

  return unreadMessages.some((message) => {
    if (!message.content) return false;

    return hasMention(message.content, ownUserId);
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

export {
  canViewChannel,
  hasUnreadMentionInMessages,
  mergeMessagesChronologically
};
