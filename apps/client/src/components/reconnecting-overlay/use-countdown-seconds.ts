import { useEffect, useState } from 'react';

const getSecondsLeft = (target: number | null) => {
  if (target === null) return 0;

  return Math.max(0, Math.ceil((target - Date.now()) / 1000));
};

const useCountdownSeconds = (target: number | null) => {
  const [secondsLeft, setSecondsLeft] = useState(() => getSecondsLeft(target));

  useEffect(() => {
    setSecondsLeft(getSecondsLeft(target));

    if (target === null) return;

    const timer = setInterval(
      () => setSecondsLeft(getSecondsLeft(target)),
      250
    );

    return () => clearInterval(timer);
  }, [target]);

  return secondsLeft;
};

export { useCountdownSeconds };
