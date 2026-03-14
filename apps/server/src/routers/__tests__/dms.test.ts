import { ServerEvents } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { initTest } from '../../__tests__/helpers';
import { tdb } from '../../__tests__/setup';
import { settings } from '../../db/schema';
import { pubsub } from '../../utils/pubsub';

describe('dms router', () => {
  test('should create a direct message channel and allow messaging', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller2 } = await initTest(2);

    const { channelId } = await caller1.dms.open({ userId: 2 });

    await caller1.messages.send({
      channelId,
      content: 'hello dm',
      files: []
    });

    const page = await caller2.messages.get({
      channelId,
      cursor: null,
      limit: 50
    });

    expect(page.messages.length).toBe(1);
    expect(page.messages[0]!.content).toBe('hello dm');
  });

  test('should reuse existing direct message channel for same pair', async () => {
    const { caller } = await initTest(1);

    const first = await caller.dms.open({ userId: 2 });
    const second = await caller.dms.open({ userId: 2 });

    expect(second.channelId).toBe(first.channelId);
  });

  test('should list direct message conversations', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller2 } = await initTest(2);

    const { channelId } = await caller1.dms.open({ userId: 2 });

    await caller1.messages.send({
      channelId,
      content: 'list dm',
      files: []
    });

    const list1 = await caller1.dms.get();
    const list2 = await caller2.dms.get();

    expect(
      list1.some((dm) => dm.channelId === channelId && dm.userId === 2)
    ).toBe(true);
    expect(
      list2.some((dm) => dm.channelId === channelId && dm.userId === 1)
    ).toBe(true);
  });

  test('should reject creating direct message with self', async () => {
    const { caller } = await initTest(1);

    await expect(caller.dms.open({ userId: 1 })).rejects.toThrow(
      'Cannot create a direct message with yourself'
    );
  });

  test('should reject open and list when direct messages are disabled', async () => {
    const { caller } = await initTest(1);

    await tdb
      .update(settings)
      .set({
        directMessagesEnabled: false
      })
      .execute();

    await expect(caller.dms.open({ userId: 2 })).rejects.toThrow(
      'Direct messages are disabled on this server'
    );

    await expect(caller.dms.get()).rejects.toThrow(
      'Direct messages are disabled on this server'
    );
  });

  test('should broadcast a full TDirectMessageConversation to each participant on open', async () => {
    const { caller: caller1 } = await initTest(1);

    // capture events emitted to each participant before triggering open
    const eventsForUser1: unknown[] = [];
    const eventsForUser2: unknown[] = [];

    const sub1 = pubsub
      .subscribeFor(1, ServerEvents.DM_CONVERSATION_OPEN)
      .subscribe({ next: (data) => eventsForUser1.push(data) });

    const sub2 = pubsub
      .subscribeFor(2, ServerEvents.DM_CONVERSATION_OPEN)
      .subscribe({ next: (data) => eventsForUser2.push(data) });

    const { channelId } = await caller1.dms.open({ userId: 2 });

    sub1.unsubscribe();
    sub2.unsubscribe();

    // each participant should receive exactly one event
    expect(eventsForUser1.length).toBe(1);
    expect(eventsForUser2.length).toBe(1);

    const eventForUser1 = eventsForUser1[0] as Record<string, unknown>;
    const eventForUser2 = eventsForUser2[0] as Record<string, unknown>;

    // user 1 should see user 2 as the other participant, and vice versa
    expect(eventForUser1).toMatchObject({
      channelId,
      userId: 2,
      unreadCount: 0
    });
    expect(eventForUser2).toMatchObject({
      channelId,
      userId: 1,
      unreadCount: 0
    });

    // lastMessageAt should be a positive number (timestamp)
    expect(typeof eventForUser1.lastMessageAt).toBe('number');
    expect(eventForUser1.lastMessageAt as number).toBeGreaterThan(0);
  });

  test('should not broadcast when opening an existing conversation', async () => {
    const { caller: caller1 } = await initTest(1);

    // open once to create the conversation
    await caller1.dms.open({ userId: 2 });

    // now listen for further events
    const events: unknown[] = [];

    const sub = pubsub
      .subscribeFor(1, ServerEvents.DM_CONVERSATION_OPEN)
      .subscribe({ next: (data) => events.push(data) });

    // open again -- should be a no-op, no new event
    await caller1.dms.open({ userId: 2 });

    sub.unsubscribe();

    expect(events.length).toBe(0);
  });
});
