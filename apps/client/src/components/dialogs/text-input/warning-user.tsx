import { UserAvatar } from '@/components/user-avatar';
import { UserPopover } from '@/components/user-popover';
import { useUserById } from '@/features/server/users/hooks';
import { memo } from 'react';

type TWarningUserProps = {
  userId: number;
};

const WarningUser = memo(({ userId }: TWarningUserProps) => {
  const user = useUserById(userId);

  if (!user) return null;

  return (
    <UserPopover userId={userId}>
      <div className="flex items-center gap-2 rounded px-1 py-0.5 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/50 min-w-0">
        <UserAvatar
          userId={userId}
          className="h-5 w-5 shrink-0"
          showStatusBadge={false}
        />
        <span className="truncate">{user.name}</span>
      </div>
    </UserPopover>
  );
});

export { WarningUser };
