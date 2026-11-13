import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { cn } from '@/lib/utils';
import { memo } from 'react';
import { useCallTime } from './use-call-time';

type TProps = {
  channelId: number;
};

const CallDuration = memo(({ channelId }: TProps) => {
  const callTime = useCallTime(channelId);
  const currentVoiceChannelId = useCurrentVoiceChannelId();

  const isOwnChannel = currentVoiceChannelId === channelId;

  if (!callTime) return null;

  return (
    <span
      className={cn(
        'text-xs tabular-nums',
        isOwnChannel ? 'text-green-500' : 'text-muted-foreground'
      )}
    >
      {callTime}
    </span>
  );
});

export { CallDuration };
