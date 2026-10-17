import { useUserById } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { cn } from '@/lib/utils';
import { AvatarImage } from '@radix-ui/react-avatar';
import { UserStatus } from '@sharkord/shared';
import { Avatar, AvatarFallback } from '@sharkord/ui';
import { blobatarUri } from 'blobatar/uri';
import { memo, useMemo } from 'react';
import { UserPopover } from '../user-popover';
import { UserStatusBadge } from '../user-status';

type TUserAvatarProps = {
  userId: number | null;
  className?: string;
  showUserPopover?: boolean;
  showStatusBadge?: boolean;
  onClick?: () => void;
};

const UserAvatar = memo(
  ({
    userId,
    className,
    showUserPopover = false,
    showStatusBadge = true,
    onClick
  }: TUserAvatarProps) => {
    const user = useUserById(userId);
    const fallbackSrc = useMemo(
      () =>
        userId === null
          ? undefined
          : blobatarUri(String(userId), { background: false }),
      [userId]
    );

    if (!user) return null;

    const content = (
      <div className="relative size-fit" onClick={onClick}>
        <Avatar className={cn('size-8 bg-muted', className)}>
          <AvatarImage src={getFileUrl(user.avatar)} key={user.avatarId} />
          <AvatarFallback>
            <img src={fallbackSrc} alt="" className="size-full" />
          </AvatarFallback>
        </Avatar>
        {showStatusBadge && (
          <UserStatusBadge
            status={user.status || UserStatus.OFFLINE}
            className="absolute bottom-0 right-0"
          />
        )}
      </div>
    );

    if (!showUserPopover || userId === null) return content;

    return <UserPopover userId={userId}>{content}</UserPopover>;
  }
);

export { UserAvatar };
