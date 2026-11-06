import { ServerEvents } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { createFakeSocket, initTest } from '../../__tests__/helpers';
import { VoiceRuntime } from '../../runtimes/voice';
import { pubsub } from '../pubsub';
import { getOnlineUserIds, handleSocketClose } from '../wss';

const connectTab = async (userId: number) => {
  const socket = createFakeSocket();
  const { caller } = await initTest(userId, { socket });

  return { socket, caller };
};

describe('presence across a user session', () => {
  test('should keep a user online until their last tab closes', async () => {
    const { socket: firstTab } = await connectTab(2);
    const { socket: secondTab } = await connectTab(2);

    expect(getOnlineUserIds()).toContain(2);

    await handleSocketClose(firstTab);

    expect(getOnlineUserIds()).toContain(2);

    await handleSocketClose(secondTab);

    expect(getOnlineUserIds()).not.toContain(2);
  });

  test('should announce the user left once, on the last tab', async () => {
    const { socket: firstTab } = await connectTab(2);
    const { socket: secondTab } = await connectTab(2);

    const departures: number[] = [];

    const subscription = pubsub.subscribe(ServerEvents.USER_LEAVE).subscribe({
      next: (userId) => {
        departures.push(userId);
      }
    });

    await handleSocketClose(firstTab);

    expect(departures).toEqual([]);

    await handleSocketClose(secondTab);

    subscription.unsubscribe();

    expect(departures).toEqual([2]);
  });

  test('should leave voice when the tab in the call closes', async () => {
    const runtime = new VoiceRuntime(2);

    await runtime.init();

    try {
      const { socket: voiceTab, caller } = await connectTab(2);
      const { socket: idleTab } = await connectTab(2);

      await caller.voice.join({
        channelId: 2,
        state: { micMuted: false, soundMuted: false }
      });

      await handleSocketClose(idleTab);

      expect(runtime.getUser(2)).toBeDefined();

      await handleSocketClose(voiceTab);

      expect(runtime.getUser(2)).toBeUndefined();
    } finally {
      await runtime.destroy();
    }
  });

  test('should keep the other tab online after the tab in the call closes', async () => {
    const runtime = new VoiceRuntime(2);

    await runtime.init();

    try {
      const { socket: voiceTab, caller } = await connectTab(2);

      await connectTab(2);

      await caller.voice.join({
        channelId: 2,
        state: { micMuted: false, soundMuted: false }
      });

      await handleSocketClose(voiceTab);

      expect(runtime.getUser(2)).toBeUndefined();
      expect(getOnlineUserIds()).toContain(2);
    } finally {
      await runtime.destroy();
    }
  });
});
