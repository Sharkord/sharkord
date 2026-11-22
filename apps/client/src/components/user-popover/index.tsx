import { useUserById } from '@/features/server/users/hooks';
import { MEDIA_QUERY, useMediaQuery } from '@/hooks/use-media-query';
import { Popover, PopoverContent, PopoverTrigger } from '@sharkord/ui';
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

  // a phone has no room beside the trigger, so the card drops below it instead
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
