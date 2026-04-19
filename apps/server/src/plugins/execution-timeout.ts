const COMMAND_EXECUTION_TIMEOUT_MS = 30_000;
const ACTION_EXECUTION_TIMEOUT_MS = 30_000;
const EVENT_HANDLER_TIMEOUT_MS = 10_000;

const withTimeout = async <T>(
  task: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> => {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([task, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

export {
  ACTION_EXECUTION_TIMEOUT_MS,
  COMMAND_EXECUTION_TIMEOUT_MS,
  EVENT_HANDLER_TIMEOUT_MS,
  withTimeout
};
