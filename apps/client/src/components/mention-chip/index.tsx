import { useOwnUserId, useUserById } from '@/features/server/users/hooks';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { cn } from '@/lib/utils';
import { memo } from 'react';
import { UserPopover } from '../user-popover';

type TMentionChipProps = {
  userId: number;
  label?: string;
};

const MentionChip = memo(({ userId, label: labelProp }: TMentionChipProps) => {
  const user = useUserById(userId);
  const ownUserId = useOwnUserId();
  const isOwnMention = ownUserId === userId;
  const label =
    labelProp ?? (user ? getRenderedUsername(user) : 'Deleted User');

  return (
    <UserPopover userId={userId}>
      <span
        className={cn(
          'mention rounded px-0.5 cursor-pointer transition-colors',
          isOwnMention
            ? 'text-yellow-400 dark:text-yellow-200 bg-primary/10 hover:bg-primary/20 font-medium'
            : 'text-primary bg-primary/10 hover:bg-primary/20'
        )}
      >
        @{label}
      </span>
    </UserPopover>
  );
});

export { MentionChip };
