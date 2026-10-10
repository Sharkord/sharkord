import { cn } from '@sharkord/ui';
import { memo, useEffect, useState } from 'react';

type TVoiceTimerProps = {
  connectedAt?: number;
  className?: string;
};

export const VoiceTimer = memo(
  ({ connectedAt, className }: TVoiceTimerProps) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
      if (!connectedAt) {
        setElapsed(0);
        return;
      }

      const interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - connectedAt) / 1000));
      }, 1000);

      setElapsed(Math.floor((Date.now() - connectedAt) / 1000));

      return () => clearInterval(interval);
    }, [connectedAt]);

    if (!connectedAt) return null;

    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;

    const displayTime =
      hours > 0
        ? `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        : `${minutes.toString().padStart(2, '0')}:${seconds
            .toString()
            .padStart(2, '0')}`;

    return (
      <span className={cn('tabular-nums shrink-0', className)}>
        {displayTime}
      </span>
    );
  }
);
