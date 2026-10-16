import { UserAvatar } from '@/components/user-avatar';
import { cn } from '@/lib/utils';
import { memo } from 'react';

type TUserAvatarStackProps = {
  userIds: number[];
  className?: string;
};

const UserAvatarStack = memo(
  ({ userIds, className }: TUserAvatarStackProps) => {
    if (userIds.length === 0) return null;

    return (
      <div className="flex -space-x-1.5">
        {userIds.map((userId) => (
          <UserAvatar
            key={userId}
            userId={userId}
            showStatusBadge={false}
            className={cn('size-5 ring-2 ring-background', className)}
          />
        ))}
      </div>
    );
  }
);

export { UserAvatarStack };
