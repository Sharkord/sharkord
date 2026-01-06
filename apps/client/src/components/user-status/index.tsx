import { cn } from '@/lib/utils';
import { UserStatus } from '@sharkord/shared';
import { memo } from 'react';

type TUserStatusBadgeProps = {
  status: UserStatus;
  className?: string;
};

const UserStatusBadge = memo(({ status, className }: TUserStatusBadgeProps) => {
  return (
    <div
      className={cn(
        'h-3 w-3 rounded-full border-2 border-card',
        status === UserStatus.ONLINE && 'bg-green-500',
        status === UserStatus.IDLE && 'bg-yellow-500',
        status === UserStatus.OFFLINE && 'bg-gray-500',
        className
      )}
    />
  );
});

export { UserStatusBadge };
