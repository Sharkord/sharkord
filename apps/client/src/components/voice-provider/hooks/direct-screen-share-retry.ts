import { DIRECT_SCREEN_SHARE_MAX_ATTEMPTS } from '@sharkord/shared';

type TAttempt = (attemptNumber: number) => Promise<boolean>;
type TWait = (failedAttempt: number, signal?: AbortSignal) => Promise<void>;

const DIRECT_SCREEN_SHARE_CONNECTION_TIMEOUT_MS = 4_000;

const createAbortError = () => {
  const error = new Error('Direct screen share attempts were aborted');
  error.name = 'AbortError';
  return error;
};

const waitBeforeRetry: TWait = (failedAttempt, signal) =>
  new Promise((resolve, reject) => {
    let onAbort = () => {};
    const timeoutId = setTimeout(
      () => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      },
      Math.min(failedAttempt * 250, 1000)
    );

    onAbort = () => {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onAbort);
      reject(createAbortError());
    };

    if (signal?.aborted) {
      onAbort();
      return;
    }

    signal?.addEventListener('abort', onAbort, { once: true });
  });

const waitForDirectScreenShareConnection = (
  connection: RTCPeerConnection,
  timeoutMs = DIRECT_SCREEN_SHARE_CONNECTION_TIMEOUT_MS,
  signal?: AbortSignal
): Promise<boolean> =>
  new Promise((resolve, reject) => {
    let settled = false;
    const timeoutRef: { current?: ReturnType<typeof setTimeout> } = {};
    let handleAbort = () => {};
    let handleConnectionStateChange = () => {};

    const cleanup = () => {
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current);
      }
      connection.removeEventListener(
        'connectionstatechange',
        handleConnectionStateChange
      );
      signal?.removeEventListener('abort', handleAbort);
    };

    const finish = (connected: boolean) => {
      if (settled) return;

      settled = true;
      cleanup();
      resolve(connected);
    };

    handleAbort = () => {
      if (settled) return;

      settled = true;
      cleanup();
      reject(createAbortError());
    };

    handleConnectionStateChange = () => {
      if (connection.connectionState === 'connected') {
        finish(true);
      } else if (
        connection.connectionState === 'failed' ||
        connection.connectionState === 'closed'
      ) {
        finish(false);
      }
    };

    const timeoutId = setTimeout(() => finish(false), timeoutMs);
    timeoutRef.current = timeoutId;

    if (signal?.aborted) {
      handleAbort();
      return;
    }

    connection.addEventListener(
      'connectionstatechange',
      handleConnectionStateChange
    );
    signal?.addEventListener('abort', handleAbort, { once: true });
    handleConnectionStateChange();
  });

const runDirectScreenShareAttempts = async (
  attempt: TAttempt,
  wait: TWait = waitBeforeRetry,
  signal?: AbortSignal
): Promise<boolean> => {
  for (
    let attemptNumber = 1;
    attemptNumber <= DIRECT_SCREEN_SHARE_MAX_ATTEMPTS;
    attemptNumber += 1
  ) {
    if (signal?.aborted) throw createAbortError();
    if (await attempt(attemptNumber)) return true;
    if (signal?.aborted) throw createAbortError();

    if (attemptNumber < DIRECT_SCREEN_SHARE_MAX_ATTEMPTS) {
      await wait(attemptNumber, signal);
      if (signal?.aborted) throw createAbortError();
    }
  }

  return false;
};

export { runDirectScreenShareAttempts, waitForDirectScreenShareConnection };
