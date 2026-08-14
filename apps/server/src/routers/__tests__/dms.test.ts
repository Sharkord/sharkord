import { describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { initTest } from '../../__tests__/helpers';
import { tdb } from '../../__tests__/setup';
import { directMessages, settings } from '../../db/schema';

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

  test('should return the same channel when the same pair is opened concurrently', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller2 } = await initTest(2);

    // both miss the existence read and both insert. the unique index on the pair makes one
    // of them lose, and the loser must be handed the winner's channel rather than a
    // constraint error
    const [first, second] = await Promise.all([
      caller1.dms.open({ userId: 2 }),
      caller2.dms.open({ userId: 1 })
    ]);

    expect(first.channelId).toBe(second.channelId);

    const rows = await tdb
      .select()
      .from(directMessages)
      .where(eq(directMessages.channelId, first.channelId));

    expect(rows.length).toBe(1);
  });

  test('should refuse a non participant every way into a dm, including the owner', async () => {
    // seeded dm between users 3 and 4
    const dmChannelId = 3;

    const { caller: owner } = await initTest(1);
    const { caller: participant } = await initTest(3);

    await expect(
      owner.messages.get({ channelId: dmChannelId })
    ).rejects.toThrow('You are not a participant in this DM channel');

    // send refuses earlier, on the channel permission, so it never reaches the membership
    // check. still a refusal, and the vaguer message leaks less about who is in the dm
    await expect(
      owner.messages.send({ channelId: dmChannelId, content: 'let me in' })
    ).rejects.toThrow('Insufficient channel permissions');

    await expect(
      owner.channels.markAsRead({ channelId: dmChannelId })
    ).rejects.toThrow('You are not a participant in this DM channel');

    // the same reads work for someone who is actually in it, so the refusals above are the
    // membership check and not the routes being broken
    await expect(
      participant.messages.get({ channelId: dmChannelId })
    ).resolves.toBeDefined();
  });
});
