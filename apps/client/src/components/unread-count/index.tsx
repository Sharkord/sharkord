import { memo } from 'react';

type TUnreadCountProps = {
  count: number;
};

const UnreadCount = memo(({ count }: TUnreadCountProps) => {
  if (count === 0) return null;

  return (
    <div className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
      {count > 99 ? '99+' : count}
    </div>
  );
});

export { UnreadCount };
