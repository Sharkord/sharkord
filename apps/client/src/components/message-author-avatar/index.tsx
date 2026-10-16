import { PluginAvatar } from '@/components/plugin-avatar';
import { UserAvatar } from '@/components/user-avatar';
import { usePluginMetadata } from '@/features/server/plugins/hooks';
import type { TMessage } from '@sharkord/shared';
import { memo } from 'react';

type TMessageAuthorAvatarProps = Pick<TMessage, 'userId' | 'pluginId'> & {
  className?: string;
  showUserPopover?: boolean;
  showStatusBadge?: boolean;
};

const MessageAuthorAvatar = memo(
  ({
    userId,
    pluginId,
    className,
    showUserPopover,
    showStatusBadge
  }: TMessageAuthorAvatarProps) => {
    const pluginMetadata = usePluginMetadata(pluginId);

    if (pluginId) {
      return (
        <PluginAvatar
          name={pluginMetadata?.name}
          avatarUrl={pluginMetadata?.avatarUrl}
          className={className}
        />
      );
    }

    return (
      <UserAvatar
        userId={userId}
        className={className}
        showUserPopover={showUserPopover}
        showStatusBadge={showStatusBadge}
      />
    );
  }
);

export { MessageAuthorAvatar };
