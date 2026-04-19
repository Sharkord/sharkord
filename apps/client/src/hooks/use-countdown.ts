import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type TUseCountdownOptions = {
  seconds: number;
  isActive: boolean;
};

const useCountdown = ({ seconds, isActive }: TUseCountdownOptions) => {
  const [countdown, setCountdown] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);

      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setCountdown(seconds);
  }, [seconds]);

  useEffect(() => {
    if (!isActive) {
      clearTimer();

      return;
    }

    reset();

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearTimer();

          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return clearTimer;
  }, [isActive, reset, clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return useMemo(() => ({ countdown, reset }), [countdown, reset]);
};

export { useCountdown };
