import { useFreezeAnimatedAvatars } from '@/features/app/hooks';
import { useUserById } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { getInitialsFromName } from '@/helpers/get-initials-from-name';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { cn } from '@/lib/utils';
import { UserStatus } from '@sharkord/shared';
import { Avatar, AvatarFallback } from '@sharkord/ui';
import { memo } from 'react';
import { FrozenImage } from '../frozen-image';
import { UserPopover } from '../user-popover';
import { UserStatusBadge } from '../user-status';
import { AvatarImage } from './avatar-image';

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

    // the initials scale with the avatar (a fixed size reads as a speck on a profile or a
    // voice tile), floored so the smallest list avatars stay legible
    const content = (
      <div className="group/avatar relative size-fit" onClick={onClick}>
        <Avatar className={cn('@container size-8 bg-muted', className)}>
          {avatarUrl && (
            <AvatarImage
              src={avatarUrl}
              key={user.avatarId}
              className={cn(frozen && 'invisible group-hover/avatar:visible')}
            />
          )}
          {frozen && (
            <FrozenImage
              src={avatarUrl}
              className="absolute inset-0 size-full group-hover/avatar:invisible"
            />
          )}
          <AvatarFallback className="bg-muted [font-size:max(0.625rem,40cqw)]">
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
