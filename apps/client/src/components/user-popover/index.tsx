import { useUserById } from '@/features/server/users/hooks';
import { Popover, PopoverContent, PopoverTrigger } from '@sharkord/ui';
import { memo } from 'react';
import { UserPopoverContent } from './user-popover-content';

type TUserPopoverProps = {
  userId: number;
  children: React.ReactNode;
};

const UserPopover = memo(({ userId, children }: TUserPopoverProps) => {
  const user = useUserById(userId);

  if (!user) return <>{children}</>;

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="right">
        <UserPopoverContent userId={userId} />
      </PopoverContent>
    </Popover>
  );
});

UserPopover.displayName = 'UserPopover';

export { UserPopover };
