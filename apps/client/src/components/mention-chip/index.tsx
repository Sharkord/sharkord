import { useUserById } from '@/features/server/users/hooks';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { memo } from 'react';
import { UserPopover } from '../user-popover';

type TMentionChipProps = {
  userId: number;
  label?: string;
};

const MentionChip = memo(({ userId, label: labelProp }: TMentionChipProps) => {
  const user = useUserById(userId);
  const label =
    labelProp ?? (user ? getRenderedUsername(user) : 'Deleted User');

  return (
    <UserPopover userId={userId}>
      <span className="mention text-primary bg-primary/10 rounded px-0.5 cursor-pointer hover:bg-primary/20">
        @{label}
      </span>
    </UserPopover>
  );
});

export { MentionChip };
