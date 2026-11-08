import { useVoiceChannelActiveSince } from '@/features/server/voice/hooks';
import { intervalToDuration } from 'date-fns';
import { useEffect, useState } from 'react';

const padTimePart = (value: number) => String(value).padStart(2, '0');

const formatCallTime = (elapsedMs: number): string => {
  const duration = intervalToDuration({ start: 0, end: elapsedMs });
  const hours = (duration.days ?? 0) * 24 + (duration.hours ?? 0);
  const minutes = duration.minutes ?? 0;
  const seconds = duration.seconds ?? 0;

  if (hours > 0) {
    return `${hours}:${padTimePart(minutes)}:${padTimePart(seconds)}`;
  }

  return `${minutes}:${padTimePart(seconds)}`;
};

export const useCallTime = (channelId: number): string | null => {
  const activeSince = useVoiceChannelActiveSince(channelId);
  const [callTime, setCallTime] = useState<string | null>(null);

  useEffect(() => {
    if (!activeSince) {
      setCallTime(null);

      return;
    }

    const update = () => {
      setCallTime(formatCallTime(Math.max(0, Date.now() - activeSince)));
    };

    update();

    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [activeSince]);

  return callTime;
};
