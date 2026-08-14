import { ServerEvents } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { createFakeSocket, initTest } from '../../__tests__/helpers';
import { pubsub } from '../pubsub';
import { getOnlineUserIds, handleSocketClose } from '../wss';

const connectTab = async (userId: number) => {
  const socket = createFakeSocket();

  await initTest(userId, { socket });

  return socket;
};

describe('presence across a user session', () => {
  test('should keep a user online until their last tab closes', async () => {
    const firstTab = await connectTab(2);
    const secondTab = await connectTab(2);

    expect(getOnlineUserIds()).toContain(2);

    await handleSocketClose(firstTab);

    expect(getOnlineUserIds()).toContain(2);

    await handleSocketClose(secondTab);

    expect(getOnlineUserIds()).not.toContain(2);
  });

  test('should announce the user left once, on the last tab', async () => {
    const firstTab = await connectTab(2);
    const secondTab = await connectTab(2);

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
});
