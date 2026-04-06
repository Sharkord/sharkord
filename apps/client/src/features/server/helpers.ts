import { ChannelPermission, hasMention } from '@sharkord/shared';
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

export { canViewChannel, hasUnreadMentionInMessages };
