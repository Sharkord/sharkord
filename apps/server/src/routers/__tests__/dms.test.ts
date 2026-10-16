import { ServerEvents } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { initTest } from '../../__tests__/helpers';
import { tdb } from '../../__tests__/setup';
import { getChannelsReadStatesForUser } from '../../db/queries/channels';
import { directMessages, settings } from '../../db/schema';
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

  test('should send direct message conversations on join', async () => {
    const { caller: caller1 } = await initTest(1);

    const { channelId } = await caller1.dms.open({ userId: 2 });

    await caller1.messages.send({
      channelId,
      content: 'list dm',
      files: []
    });

    const { initialData: data1 } = await initTest(1);
    const { initialData: data2 } = await initTest(2);

    expect(data1.directMessages).toContainEqual(
      expect.objectContaining({ channelId, userId: 2 })
    );
    expect(data2.directMessages).toContainEqual(
      expect.objectContaining({ channelId, userId: 1 })
    );
  });

  test('should order conversations by their latest message', async () => {
    const { caller } = await initTest(1);

    const { channelId: firstChannelId } = await caller.dms.open({ userId: 2 });
    const { channelId: secondChannelId } = await caller.dms.open({
      userId: 4
    });

    await Bun.sleep(2);

    await caller.messages.send({
      channelId: firstChannelId,
      content: 'bump',
      files: []
    });

    const { initialData } = await initTest(1);
    const channelIds = initialData.directMessages.map((dm) => dm.channelId);

    expect(channelIds.indexOf(firstChannelId)).toBeLessThan(
      channelIds.indexOf(secondChannelId)
    );
  });

  test('should tell each participant about a new conversation under the other name', async () => {
    const { caller } = await initTest(1);

    const events: { userId: number; payload: unknown }[] = [];

    const subscriptions = [1, 2].map((userId) =>
      pubsub
        .subscribeFor(userId, ServerEvents.DM_CONVERSATION_UPDATE)
        .subscribe({ next: (payload) => events.push({ userId, payload }) })
    );

    const { channelId } = await caller.dms.open({ userId: 2 });

    subscriptions.forEach((subscription) => subscription.unsubscribe());

    expect(events).toEqual([
      {
        userId: 1,
        payload: {
          channelId,
          userId: 2,
          lastMessageAt: expect.any(Number),
          closedAt: null
        }
      },
      {
        userId: 2,
        payload: {
          channelId,
          userId: 1,
          lastMessageAt: expect.any(Number),
          closedAt: expect.any(Number)
        }
      }
    ]);
  });

  test('should reject creating direct message with self', async () => {
    const { caller } = await initTest(1);

    await expect(caller.dms.open({ userId: 1 })).rejects.toThrow(
      'Cannot create a direct message with yourself'
    );
  });

  test('should reject opening a conversation when direct messages are disabled', async () => {
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

  // the refusal below covers a non participant marking a dm read. the participant doing it is
  // what the badge depends on, and it is the half that broke in R2
  test('should clear the unread count when a participant reads a dm', async () => {
    const dmChannelId = 3;

    const { caller: sender } = await initTest(3);
    const { caller: reader } = await initTest(4);

    // the seed already leaves user 4 one unread message in this conversation
    const seeded = await getChannelsReadStatesForUser(4, dmChannelId);

    expect(seeded[dmChannelId]).toBe(1);

    await sender.messages.send({
      channelId: dmChannelId,
      content: 'unread on purpose'
    });

    const beforeRead = await getChannelsReadStatesForUser(4, dmChannelId);

    expect(beforeRead[dmChannelId]).toBe(2);

    const readStateUpdates: { channelId: number; count: number }[] = [];

    const subscription = pubsub
      .subscribeFor(4, ServerEvents.CHANNEL_READ_STATES_UPDATE)
      .subscribe({
        next: (update) => {
          readStateUpdates.push(update);
        }
      });

    await reader.channels.markAsRead({ channelId: dmChannelId });

    subscription.unsubscribe();

    const afterRead = await getChannelsReadStatesForUser(4, dmChannelId);

    expect(afterRead[dmChannelId]).toBe(0);

    // the reader's other tabs drop the badge off this event, not off a refetch
    expect(readStateUpdates).toEqual([{ channelId: dmChannelId, count: 0 }]);
  });

  test('should keep a dm read once its newest message has been read', async () => {
    const dmChannelId = 3;

    const { caller: sender } = await initTest(3);
    const { caller: reader } = await initTest(4);

    await sender.messages.send({
      channelId: dmChannelId,
      content: 'first'
    });

    await reader.channels.markAsRead({ channelId: dmChannelId });

    // reopening the same conversation must not resurrect the badge
    await reader.channels.markAsRead({ channelId: dmChannelId });

    const afterSecondRead = await getChannelsReadStatesForUser(4, dmChannelId);

    expect(afterSecondRead[dmChannelId]).toBe(0);

    await sender.messages.send({
      channelId: dmChannelId,
      content: 'second'
    });

    const afterNewMessage = await getChannelsReadStatesForUser(4, dmChannelId);

    expect(afterNewMessage[dmChannelId]).toBe(1);
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

  describe('closing a conversation', () => {
    const getConversation = async (userId: number, channelId: number) => {
      const { initialData } = await initTest(userId);

      return initialData.directMessages.find(
        (dm) => dm.channelId === channelId
      );
    };

    const isVisible = (dm: {
      closedAt: number | null;
      lastMessageAt: number;
    }) => dm.closedAt === null || dm.lastMessageAt > dm.closedAt;

    test('should keep a new conversation hidden for the other user until a message arrives', async () => {
      const { caller } = await initTest(1);

      const { channelId } = await caller.dms.open({ userId: 2 });

      expect(isVisible((await getConversation(1, channelId))!)).toBe(true);
      expect(isVisible((await getConversation(2, channelId))!)).toBe(false);

      await Bun.sleep(2);

      await caller.messages.send({ channelId, content: 'hi', files: [] });

      expect(isVisible((await getConversation(2, channelId))!)).toBe(true);
    });

    test('should hide a conversation for the caller only', async () => {
      const { caller: caller1 } = await initTest(1);
      const { caller: caller2 } = await initTest(2);

      const { channelId } = await caller1.dms.open({ userId: 2 });

      await caller1.messages.send({ channelId, content: 'hi', files: [] });
      await caller2.dms.close({ channelId });

      expect(isVisible((await getConversation(2, channelId))!)).toBe(false);
      expect(isVisible((await getConversation(1, channelId))!)).toBe(true);
    });

    test('should bring a closed conversation back on a new message, history intact', async () => {
      const { caller: caller1 } = await initTest(1);
      const { caller: caller2 } = await initTest(2);

      const { channelId } = await caller1.dms.open({ userId: 2 });

      await caller1.messages.send({ channelId, content: 'first', files: [] });
      await caller2.dms.close({ channelId });

      await Bun.sleep(2);

      await caller1.messages.send({ channelId, content: 'second', files: [] });

      expect(isVisible((await getConversation(2, channelId))!)).toBe(true);

      const { messages } = await caller2.messages.get({ channelId });

      expect(messages.map((message) => message.content)).toEqual([
        'second',
        'first'
      ]);
    });

    test('should bring a closed conversation back when the caller opens it again', async () => {
      const { caller } = await initTest(1);

      const { channelId } = await caller.dms.open({ userId: 2 });

      await caller.dms.close({ channelId });

      expect((await getConversation(1, channelId))!.closedAt).not.toBeNull();

      const reopened = await caller.dms.open({ userId: 2 });

      expect(reopened.channelId).toBe(channelId);
      expect((await getConversation(1, channelId))!.closedAt).toBeNull();
    });

    test('should mark a closed conversation as read', async () => {
      const { caller: caller1 } = await initTest(1);
      const { caller: caller2 } = await initTest(2);

      const { channelId } = await caller1.dms.open({ userId: 2 });

      await caller1.messages.send({ channelId, content: 'unread', files: [] });

      expect(
        (await getChannelsReadStatesForUser(2, channelId))[channelId]
      ).toBe(1);

      await caller2.dms.close({ channelId });

      expect(
        (await getChannelsReadStatesForUser(2, channelId))[channelId]
      ).toBe(0);
    });

    test('should publish the closed conversation to the caller', async () => {
      const { caller } = await initTest(1);

      const { channelId } = await caller.dms.open({ userId: 2 });

      const events: unknown[] = [];

      const subscription = pubsub
        .subscribeFor(1, ServerEvents.DM_CONVERSATION_UPDATE)
        .subscribe({ next: (payload) => events.push(payload) });

      await caller.dms.close({ channelId });

      subscription.unsubscribe();

      expect(events).toEqual([
        {
          channelId,
          userId: 2,
          lastMessageAt: expect.any(Number),
          closedAt: expect.any(Number)
        }
      ]);
    });

    test('should throw when the conversation does not exist', async () => {
      const { caller } = await initTest(1);

      await expect(caller.dms.close({ channelId: 999999 })).rejects.toThrow(
        'Conversation not found'
      );
    });

    test('should throw when the caller is not part of the conversation', async () => {
      const { caller } = await initTest(1);

      // channel 3 is the dm between users 3 and 4
      await expect(caller.dms.close({ channelId: 3 })).rejects.toThrow(
        'Conversation not found'
      );
    });

    test('should throw when direct messages are disabled', async () => {
      const { caller } = await initTest(3);

      await tdb
        .update(settings)
        .set({ directMessagesEnabled: false })
        .execute();

      await expect(caller.dms.close({ channelId: 3 })).rejects.toThrow(
        'Direct messages are disabled on this server'
      );
    });

    test('should reject an input without a channel', async () => {
      const { caller } = await initTest(1);

      // @ts-expect-error testing invalid input
      await expect(caller.dms.close({})).rejects.toThrow();
    });
  });
});

describe('direct message visibility', () => {
  const getConversation = async (userId: number, channelId: number) => {
    const { initialData } = await initTest(userId);

    return initialData.directMessages.find((dm) => dm.channelId === channelId);
  };

  const isVisible = (dm: { closedAt: number | null; lastMessageAt: number }) =>
    dm.closedAt === null || dm.lastMessageAt > dm.closedAt;

  test('the other user opening an empty conversation through + shows it for them', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller2 } = await initTest(2);

    const { channelId } = await caller1.dms.open({ userId: 2 });

    expect(isVisible((await getConversation(2, channelId))!)).toBe(false);

    const reopened = await caller2.dms.open({ userId: 1 });

    expect(reopened.channelId).toBe(channelId);
    expect(isVisible((await getConversation(2, channelId))!)).toBe(true);
  });

  test('reopening a closed conversation keeps every earlier message', async () => {
    const { caller } = await initTest(1);

    const { channelId } = await caller.dms.open({ userId: 2 });

    await caller.messages.send({ channelId, content: 'before', files: [] });
    await caller.dms.close({ channelId });
    await caller.dms.open({ userId: 2 });

    const { messages } = await caller.messages.get({ channelId });

    expect(messages.map((message) => message.content)).toEqual(['before']);
  });

  test('a thread reply in a closed conversation brings it back', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller2 } = await initTest(2);

    const { channelId } = await caller1.dms.open({ userId: 2 });

    const parentId = await caller1.messages.send({
      channelId,
      content: 'parent',
      files: []
    });

    await caller2.dms.close({ channelId });
    await Bun.sleep(2);

    await caller1.messages.send({
      channelId,
      content: 'reply',
      files: [],
      parentMessageId: parentId!
    });

    expect(isVisible((await getConversation(2, channelId))!)).toBe(true);
  });

  test('closing one conversation leaves the caller other conversations alone', async () => {
    const { caller } = await initTest(1);

    const { channelId: firstChannelId } = await caller.dms.open({ userId: 2 });
    const { channelId: secondChannelId } = await caller.dms.open({ userId: 4 });

    await caller.dms.close({ channelId: firstChannelId });

    expect(isVisible((await getConversation(1, secondChannelId))!)).toBe(true);
  });

  test('closing a conversation twice keeps it closed', async () => {
    const { caller } = await initTest(1);

    const { channelId } = await caller.dms.open({ userId: 2 });

    await caller.dms.close({ channelId });
    await caller.dms.close({ channelId });

    expect(isVisible((await getConversation(1, channelId))!)).toBe(false);
  });

  test('closing a regular channel id is refused', async () => {
    const { caller } = await initTest(1);

    await expect(caller.dms.close({ channelId: 1 })).rejects.toThrow(
      'Conversation not found'
    );
  });
});
