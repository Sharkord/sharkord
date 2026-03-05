import { cn } from '@sharkord/ui';
import { memo } from 'react';

type TUnreadCountProps = {
  count: number;
  hasMention?: boolean;
};

const UnreadCount = memo(({ count, hasMention }: TUnreadCountProps) => {
  if (count === 0) return null;

  return (
    <div
      className={cn(
        'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground',
        hasMention && 'bg-red-500 text-white'
      )}
    >
      {count > 99 ? '99+' : count}
    </div>
  );
});

export { UnreadCount };
