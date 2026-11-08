import { memo } from 'react';
import { useCallTime } from './use-call-time';

type TProps = {
  channelId: number;
};

const CallDuration = memo(({ channelId }: TProps) => {
  const callTime = useCallTime(channelId);

  if (!callTime) return null;

  return (
    <span className="ml-auto text-xs text-muted-foreground tabular-nums">
      {callTime}
    </span>
  );
});

export { CallDuration };
