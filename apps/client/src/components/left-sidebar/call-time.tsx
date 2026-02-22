import { cn } from '@/lib/utils';
import { memo } from 'react';
import { useCallTime } from './use-call-time';

type TCallTimeProps = {
  channelId: number;
  className?: string;
};

const CallTime = memo(({ channelId, className }: TCallTimeProps) => {
  const callTime = useCallTime(channelId);

  if (!callTime) {
    return null;
  }

  return <span className={cn('ml-auto text-xs font-medium text-green-500', className)}>{callTime}</span>;
});

export { CallTime };
