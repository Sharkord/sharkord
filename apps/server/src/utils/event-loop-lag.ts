const PROBE_INTERVAL_MS = 500;

let timer: ReturnType<typeof setInterval> | undefined;
let lastTick = 0;
let maxLag = 0;

const startEventLoopMonitor = () => {
  if (timer) return;

  lastTick = performance.now();
  maxLag = 0;

  timer = setInterval(() => {
    const now = performance.now();

    maxLag = Math.max(maxLag, now - lastTick - PROBE_INTERVAL_MS);
    lastTick = now;
  }, PROBE_INTERVAL_MS);

  timer.unref();
};

const stopEventLoopMonitor = () => {
  if (!timer) return;

  clearInterval(timer);
  timer = undefined;
};

const takeEventLoopLag = () => {
  const lag = maxLag;

  maxLag = 0;

  return lag;
};

export { startEventLoopMonitor, stopEventLoopMonitor, takeEventLoopLag };
