import { useUserById } from '@/features/server/users/hooks';
import {
  MEDIA_QUERY,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useMediaQuery
} from '@sharkord/ui';
import { memo } from 'react';
import { UserPopoverContent } from './user-popover-content';

type TUserPopoverProps = {
  userId: number;
  children: React.ReactNode;
};

const UserPopover = memo(({ userId, children }: TUserPopoverProps) => {
  const user = useUserById(userId);
  const isWideScreen = useMediaQuery(MEDIA_QUERY.md);

  if (!user) return <>{children}</>;

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="start"
        side={isWideScreen ? 'right' : 'bottom'}
      >
        <UserPopoverContent userId={userId} />
      </PopoverContent>
    </Popover>
  );
});

UserPopover.displayName = 'UserPopover';

export { UserPopover };
