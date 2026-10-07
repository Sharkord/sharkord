import { describe, expect, test } from 'bun:test';
import {
  runDirectScreenShareAttempts,
  waitForDirectScreenShareConnection
} from '../hooks/direct-screen-share-retry';

type TTestConnection = {
  connectionState: RTCPeerConnectionState;
  addEventListener: (
    type: 'connectionstatechange',
    listener: EventListener
  ) => void;
  removeEventListener: (
    type: 'connectionstatechange',
    listener: EventListener
  ) => void;
  setConnectionState: (state: RTCPeerConnectionState) => void;
};

const createTestConnection = (
  initialState: RTCPeerConnectionState
): TTestConnection => {
  let connectionState = initialState;
  const listeners = new Set<EventListener>();

  return {
    get connectionState() {
      return connectionState;
    },
    addEventListener: (_type, listener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type, listener) => {
      listeners.delete(listener);
    },
    setConnectionState: (state) => {
      connectionState = state;
      const event = new Event('connectionstatechange');

      for (const listener of listeners) listener(event);
    }
  };
};

describe('runDirectScreenShareAttempts', () => {
  test('tries ten times before reporting that direct connection failed', async () => {
    const attempts: number[] = [];
    const delays: number[] = [];

    const connected = await runDirectScreenShareAttempts(
      async (attempt) => {
        attempts.push(attempt);
        return false;
      },
      async (attempt) => {
        delays.push(attempt);
      }
    );

    expect(connected).toBe(false);
    expect(attempts).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(delays).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  test('cancels the retry delay promptly when aborted', async () => {
    const controller = new AbortController();
    const attempts: number[] = [];
    const result = runDirectScreenShareAttempts(
      async (attempt) => {
        attempts.push(attempt);
        return false;
      },
      undefined,
      controller.signal
    ).catch((error) => error);

    setTimeout(() => controller.abort(), 0);

    const outcome = await Promise.race([
      result,
      new Promise((resolve) => setTimeout(() => resolve('timeout'), 100))
    ]);

    expect(outcome).toMatchObject({ name: 'AbortError' });
    expect(attempts).toEqual([1]);
  });

  test('stops retrying as soon as a direct connection succeeds', async () => {
    const attempts: number[] = [];

    const connected = await runDirectScreenShareAttempts(
      async (attempt) => {
        attempts.push(attempt);
        return attempt === 4;
      },
      async () => {}
    );

    expect(connected).toBe(true);
    expect(attempts).toEqual([1, 2, 3, 4]);
  });

  test('stops the retry sequence when it is aborted', async () => {
    const attempts: number[] = [];
    const controller = new AbortController();

    await expect(
      runDirectScreenShareAttempts(
        async (attempt) => {
          attempts.push(attempt);
          return false;
        },
        async () => controller.abort(),
        controller.signal
      )
    ).rejects.toMatchObject({ name: 'AbortError' });

    expect(attempts).toEqual([1]);
  });

  test('resolves when the peer connection becomes connected', async () => {
    const connection = createTestConnection('connecting');
    const result = waitForDirectScreenShareConnection(
      connection as unknown as RTCPeerConnection,
      1000
    );

    connection.setConnectionState('connected');
    expect(await result).toBe(true);
  });

  test('does not count offer signaling or a recoverable disconnect as connected', async () => {
    const connection = createTestConnection('connecting');
    let settled = false;
    const result = waitForDirectScreenShareConnection(
      connection as unknown as RTCPeerConnection,
      1000
    ).then((connected) => {
      settled = true;
      return connected;
    });

    connection.setConnectionState('disconnected');
    await Promise.resolve();
    expect(settled).toBe(false);
    connection.setConnectionState('connected');
    expect(await result).toBe(true);
  });

  test('ignores a late connected event after timeout', async () => {
    const connection = createTestConnection('connecting');
    const result = waitForDirectScreenShareConnection(
      connection as unknown as RTCPeerConnection,
      1
    );

    expect(await result).toBe(false);
    connection.setConnectionState('connected');
    expect(await result).toBe(false);
  });

  test('returns false when the peer connection fails or times out', async () => {
    const failedConnection = createTestConnection('connecting');
    const failedResult = waitForDirectScreenShareConnection(
      failedConnection as unknown as RTCPeerConnection,
      1000
    );
    failedConnection.setConnectionState('failed');
    expect(await failedResult).toBe(false);

    const timeoutConnection = createTestConnection('connecting');
    expect(
      await waitForDirectScreenShareConnection(
        timeoutConnection as unknown as RTCPeerConnection,
        1
      )
    ).toBe(false);
  });

  test('rejects the connection wait when it is aborted', async () => {
    const connection = createTestConnection('connecting');
    const controller = new AbortController();
    const result = waitForDirectScreenShareConnection(
      connection as unknown as RTCPeerConnection,
      1000,
      controller.signal
    );

    controller.abort();
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });
});
