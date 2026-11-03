import { useFreezeAnimatedAvatars } from '@/features/app/hooks';
import { useUserById } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { getInitialsFromName } from '@/helpers/get-initials-from-name';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { cn } from '@/lib/utils';
import { AvatarImage } from '@radix-ui/react-avatar';
import { UserStatus } from '@sharkord/shared';
import { Avatar, AvatarFallback } from '@sharkord/ui';
import { memo } from 'react';
import { UserPopover } from '../user-popover';
import { UserStatusBadge } from '../user-status';
import { FrozenAvatarImage } from './frozen-avatar-image';

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
    const freezeAnimatedAvatars = useFreezeAnimatedAvatars();

    if (!user) return null;

    const avatarUrl = getFileUrl(user.avatar);
    const frozen = freezeAnimatedAvatars && !!avatarUrl;

    const content = (
      <div className="group/avatar relative size-fit" onClick={onClick}>
        <Avatar className={cn('size-8 bg-muted', className)}>
          <AvatarImage
            src={avatarUrl}
            key={user.avatarId}
            className={cn(frozen && 'invisible group-hover/avatar:visible')}
          />
          {frozen && <FrozenAvatarImage src={avatarUrl} />}
          <AvatarFallback className="bg-muted text-xs">
            {getInitialsFromName(getRenderedUsername(user))}
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
