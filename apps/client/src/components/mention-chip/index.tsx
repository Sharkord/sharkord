import { UserHoverCard } from '@/components/user-hover-card';
import { useUserById } from '@/features/server/users/hooks';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { memo } from 'react';

type TMentionChipProps = {
  userId: number;
  label?: string;
};

const MentionChip = memo(({ userId, label: labelProp }: TMentionChipProps) => {
  const user = useUserById(userId);
  const label =
    labelProp ?? (user ? getRenderedUsername(user) : String(userId));

  return (
    <UserHoverCard userId={userId}>
      <span className="mention text-primary bg-primary/10 rounded px-0.5 cursor-pointer hover:bg-primary/20">
        @{label}
      </span>
    </UserHoverCard>
  );
});

MentionChip.displayName = 'MentionChip';

export { MentionChip };
