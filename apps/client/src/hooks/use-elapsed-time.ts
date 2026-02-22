import { useEffect, useMemo, useState } from 'react';

function formatElapsed(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function useElapsedTime(startTime: string | null) {
  const startMs = useMemo(() => {
    if (!startTime) return null;
    return new Date(startTime).getTime();
  }, [startTime]);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startMs) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [startMs]);

  return useMemo(() => {
    if (!startMs) return '00:00';
    return formatElapsed(Math.max(0, now - startMs));
  }, [now, startMs]);
}
