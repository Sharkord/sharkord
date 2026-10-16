import { ServerEvents, type TThreadFollowUpdate } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import {
  createFakeSocket,
  initTest,
  sendMessage
} from '../../__tests__/helpers';
import { tdb } from '../../__tests__/setup';
import { messages } from '../../db/schema';
import { pubsub } from '../../utils/pubsub';
import { handleSocketClose } from '../../utils/wss';

// plugin authored replies, edits and deletes go through the same followThreadOnReply,
// followThreadOnEdit and refreshThreadFollowers as the user routes, the plugin harness is not
// set up here, so only the user paths are exercised

const mention = (userId: number) =>
  `<p><span data-type="mention" data-user-id="${userId}" class="mention">@user</span> hi</p>`;

const roleMention = (roleId: number) =>
  `<p><span data-type="role-mention" data-role-id="${roleId}" class="role-mention">@role</span> hi</p>`;

const getFollowedThreads = async (userId: number) => {
  const { initialData } = await initTest(userId);

  return initialData.followedThreads;
};

const getUnreadCount = async (userId: number, parentMessageId: number) => {
  const followedThreads = await getFollowedThreads(userId);

  return followedThreads[parentMessageId]?.unreadCount;
};

// follow updates only reach online users, which takes a connected socket
const connectOnline = async (userId: number) => {
  const socket = createFakeSocket();
  const { caller } = await initTest(userId, { socket });

  return { caller, disconnect: () => handleSocketClose(socket) };
};

const followed = (
  parentMessageId: number,
  unreadCount: number,
  hasUnreadMention = false
) => ({
  parentMessageId,
  channelId: 1,
  unreadCount,
  hasUnreadMention,
  thread: expect.objectContaining({ parentMessageId, channelId: 1 })
});

const unfollowed = (parentMessageId: number) => ({
  parentMessageId,
  channelId: 1,
  unreadCount: 0,
  hasUnreadMention: false,
  thread: null
});

const collectFollowUpdates = (userId: number) => {
  const events: TThreadFollowUpdate[] = [];

  const subscription = pubsub
    .subscribeFor(userId, ServerEvents.THREAD_FOLLOW_UPDATE)
    .subscribe({ next: (event) => events.push(event) });

  return { events, stop: () => subscription.unsubscribe() };
};

describe('thread followers', () => {
  test('should follow the thread for the reply author and the parent author', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller2 } = await initTest(2);

    const parentId = await sendMessage(caller1, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    await caller2.messages.send({
      channelId: 1,
      content: '<p>Reply</p>',
      files: [],
      parentMessageId: parentId
    });

    expect(await getUnreadCount(1, parentId)).toBe(1);
    expect(await getUnreadCount(2, parentId)).toBe(0);
  });

  test('should not follow a thread nobody replied to', async () => {
    const { caller } = await initTest(1);

    const parentId = await sendMessage(caller, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    expect((await getFollowedThreads(1))[parentId]).toBeUndefined();
  });

  test('should follow the thread for a mentioned user with only that reply unread', async () => {
    const { caller } = await initTest(1);

    const parentId = await sendMessage(caller, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    for (let i = 0; i < 3; i++) {
      await caller.messages.send({
        channelId: 1,
        content: `<p>Reply ${i}</p>`,
        files: [],
        parentMessageId: parentId
      });
    }

    await caller.messages.send({
      channelId: 1,
      content: mention(3),
      files: [],
      parentMessageId: parentId
    });

    expect(await getUnreadCount(3, parentId)).toBe(1);
  });

  test('should ignore mentions of users that do not exist', async () => {
    const { caller } = await initTest(1);

    const parentId = await sendMessage(caller, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    const replyId = await sendMessage(caller, {
      channelId: 1,
      content: mention(999999),
      files: [],
      parentMessageId: parentId
    });

    expect(replyId).toBeNumber();
    expect(await getUnreadCount(1, parentId)).toBe(0);
  });

  test('should not follow the thread for a role mention', async () => {
    const { caller } = await initTest(1);

    const parentId = await sendMessage(caller, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    await caller.messages.send({
      channelId: 1,
      content: roleMention(2),
      files: [],
      parentMessageId: parentId
    });

    expect((await getFollowedThreads(3))[parentId]).toBeUndefined();
  });

  test('should mark the thread as read for whoever replies', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller2 } = await initTest(2);

    const parentId = await sendMessage(caller1, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    for (let i = 0; i < 2; i++) {
      await caller2.messages.send({
        channelId: 1,
        content: `<p>Reply ${i}</p>`,
        files: [],
        parentMessageId: parentId
      });
    }

    expect(await getUnreadCount(1, parentId)).toBe(2);

    await caller1.messages.send({
      channelId: 1,
      content: '<p>Answer</p>',
      files: [],
      parentMessageId: parentId
    });

    expect(await getUnreadCount(1, parentId)).toBe(0);
  });

  test('should publish the unread count to followers on a new reply', async () => {
    const { caller: caller1, disconnect: disconnect1 } = await connectOnline(1);
    const { caller: caller2, disconnect: disconnect2 } = await connectOnline(2);

    const parentId = await sendMessage(caller1, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    const owner = collectFollowUpdates(1);
    const replier = collectFollowUpdates(2);

    await caller2.messages.send({
      channelId: 1,
      content: '<p>Reply</p>',
      files: [],
      parentMessageId: parentId
    });

    owner.stop();
    replier.stop();

    await disconnect1();
    await disconnect2();

    expect(owner.events).toEqual([followed(parentId, 1)]);
    expect(replier.events).toEqual([followed(parentId, 0)]);
    expect(owner.events[0]?.thread).toMatchObject({
      userId: 1,
      content: '<p>Parent</p>',
      replyCount: 1,
      replyUserIds: [2]
    });
  });

  test('should recompute the unread count when a reply is deleted', async () => {
    const { caller: caller1, disconnect } = await connectOnline(1);
    const { caller: caller2 } = await initTest(2);

    const parentId = await sendMessage(caller1, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    const replyId = await sendMessage(caller2, {
      channelId: 1,
      content: '<p>Reply</p>',
      files: [],
      parentMessageId: parentId
    });

    const owner = collectFollowUpdates(1);

    await caller2.messages.delete({ messageId: replyId });

    // the publish is not awaited by the delete route
    await Bun.sleep(20);

    owner.stop();

    await disconnect();

    expect(owner.events).toEqual([followed(parentId, 0)]);
  });

  test('should not tell a follower about a thread in a channel they cannot see', async () => {
    const { caller } = await initTest(1);
    const { disconnect } = await connectOnline(2);

    // channel 5 is denied to user 2, a mention still writes the follower row
    const parentId = await sendMessage(caller, {
      channelId: 5,
      content: '<p>Parent</p>',
      files: []
    });

    const hidden = collectFollowUpdates(2);

    await caller.messages.send({
      channelId: 5,
      content: mention(2),
      files: [],
      parentMessageId: parentId
    });

    hidden.stop();

    await disconnect();

    expect(hidden.events).toEqual([]);
    expect((await getFollowedThreads(2))[parentId]).toBeUndefined();
  });

  test('should drop the followed thread when the parent is deleted', async () => {
    const { caller } = await initTest(1);

    const parentId = await sendMessage(caller, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    await caller.messages.send({
      channelId: 1,
      content: '<p>Reply</p>',
      files: [],
      parentMessageId: parentId
    });

    await caller.messages.delete({ messageId: parentId });

    expect((await getFollowedThreads(1))[parentId]).toBeUndefined();
  });
});

describe('threads.setFollow', () => {
  test('should follow a thread with its existing replies read', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller3 } = await initTest(3);

    const parentId = await sendMessage(caller1, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    await caller1.messages.send({
      channelId: 1,
      content: '<p>Reply</p>',
      files: [],
      parentMessageId: parentId
    });

    await caller3.threads.setFollow({
      parentMessageId: parentId,
      follow: true
    });

    expect(await getUnreadCount(3, parentId)).toBe(0);

    await caller1.messages.send({
      channelId: 1,
      content: '<p>Later reply</p>',
      files: [],
      parentMessageId: parentId
    });

    expect(await getUnreadCount(3, parentId)).toBe(1);
  });

  test('should follow a thread that has no replies yet', async () => {
    const { caller } = await initTest(1);

    const parentId = await sendMessage(caller, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    await caller.threads.setFollow({ parentMessageId: parentId, follow: true });

    expect(await getUnreadCount(1, parentId)).toBe(0);
  });

  test('should unfollow a thread and stop counting its replies', async () => {
    const { caller: caller1, disconnect } = await connectOnline(1);
    const { caller: caller2 } = await initTest(2);

    const parentId = await sendMessage(caller1, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    await caller2.messages.send({
      channelId: 1,
      content: '<p>Reply</p>',
      files: [],
      parentMessageId: parentId
    });

    await caller1.threads.setFollow({
      parentMessageId: parentId,
      follow: false
    });

    const owner = collectFollowUpdates(1);

    await caller2.messages.send({
      channelId: 1,
      content: '<p>Another reply</p>',
      files: [],
      parentMessageId: parentId
    });

    owner.stop();

    await disconnect();

    expect(owner.events).toEqual([]);
    expect((await getFollowedThreads(1))[parentId]).toBeUndefined();
  });

  test('should publish the follow state to the caller', async () => {
    const { caller } = await initTest(1);

    const parentId = await sendMessage(caller, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    const own = collectFollowUpdates(1);

    await caller.threads.setFollow({ parentMessageId: parentId, follow: true });
    await caller.threads.setFollow({
      parentMessageId: parentId,
      follow: false
    });

    own.stop();

    expect(own.events).toEqual([followed(parentId, 0), unfollowed(parentId)]);
  });

  test('should throw when the parent message does not exist', async () => {
    const { caller } = await initTest(1);

    await expect(
      caller.threads.setFollow({ parentMessageId: 999999, follow: true })
    ).rejects.toThrow('Parent message not found');
  });

  test('should throw when following a thread reply', async () => {
    const { caller } = await initTest(1);

    const parentId = await sendMessage(caller, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    const replyId = await sendMessage(caller, {
      channelId: 1,
      content: '<p>Reply</p>',
      files: [],
      parentMessageId: parentId
    });

    await expect(
      caller.threads.setFollow({ parentMessageId: replyId, follow: true })
    ).rejects.toThrow('Cannot get thread for a reply message');
  });

  test('should throw when the caller cannot view the channel', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller2 } = await initTest(2);

    const parentId = await sendMessage(caller1, {
      channelId: 5,
      content: '<p>Parent</p>',
      files: []
    });

    await expect(
      caller2.threads.setFollow({ parentMessageId: parentId, follow: true })
    ).rejects.toThrow('Insufficient channel permissions');
  });

  test('should throw when the caller is not part of the DM', async () => {
    const { caller } = await initTest(2);

    // message 2 is in the DM between users 3 and 4
    await expect(
      caller.threads.setFollow({ parentMessageId: 2, follow: true })
    ).rejects.toThrow('You are not a participant in this DM channel');
  });

  test('should reject an input without the follow flag', async () => {
    const { caller } = await initTest(1);

    await expect(
      // @ts-expect-error testing invalid input
      caller.threads.setFollow({ parentMessageId: 1 })
    ).rejects.toThrow();
  });
});

describe('threads.markAsRead', () => {
  test('should mark a followed thread as read and publish it to the caller', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller2 } = await initTest(2);

    const parentId = await sendMessage(caller1, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    await caller2.messages.send({
      channelId: 1,
      content: '<p>Reply</p>',
      files: [],
      parentMessageId: parentId
    });

    const own = collectFollowUpdates(1);

    await caller1.threads.markAsRead({ parentMessageId: parentId });

    own.stop();

    expect(own.events).toEqual([followed(parentId, 0)]);
    expect(await getUnreadCount(1, parentId)).toBe(0);
  });

  test('should not follow a thread the caller only reads', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller3 } = await initTest(3);

    const parentId = await sendMessage(caller1, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    await caller1.messages.send({
      channelId: 1,
      content: '<p>Reply</p>',
      files: [],
      parentMessageId: parentId
    });

    const own = collectFollowUpdates(3);

    await caller3.threads.markAsRead({ parentMessageId: parentId });

    own.stop();

    expect(own.events).toEqual([]);
    expect((await getFollowedThreads(3))[parentId]).toBeUndefined();
  });

  test('should do nothing for a thread without replies', async () => {
    const { caller } = await initTest(1);

    const parentId = await sendMessage(caller, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    await caller.threads.setFollow({ parentMessageId: parentId, follow: true });

    const own = collectFollowUpdates(1);

    await caller.threads.markAsRead({ parentMessageId: parentId });

    own.stop();

    expect(own.events).toEqual([]);
  });

  test('should throw when the parent message does not exist', async () => {
    const { caller } = await initTest(1);

    await expect(
      caller.threads.markAsRead({ parentMessageId: 999999 })
    ).rejects.toThrow('Parent message not found');
  });

  test('should throw when marking a thread reply as read', async () => {
    const { caller } = await initTest(1);

    const parentId = await sendMessage(caller, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    const replyId = await sendMessage(caller, {
      channelId: 1,
      content: '<p>Reply</p>',
      files: [],
      parentMessageId: parentId
    });

    await expect(
      caller.threads.markAsRead({ parentMessageId: replyId })
    ).rejects.toThrow('Cannot get thread for a reply message');
  });

  test('should throw when the caller cannot view the channel', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller2 } = await initTest(2);

    const parentId = await sendMessage(caller1, {
      channelId: 5,
      content: '<p>Parent</p>',
      files: []
    });

    await expect(
      caller2.threads.markAsRead({ parentMessageId: parentId })
    ).rejects.toThrow('Insufficient channel permissions');
  });

  test('should throw when the caller is not part of the DM', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.threads.markAsRead({ parentMessageId: 2 })
    ).rejects.toThrow('You are not a participant in this DM channel');
  });
});

describe('threads.getFollowed', () => {
  test('should list followed threads by latest reply', async () => {
    const { caller } = await initTest(1);

    const firstParentId = await sendMessage(caller, {
      channelId: 1,
      content: '<p>First</p>',
      files: []
    });

    const secondParentId = await sendMessage(caller, {
      channelId: 1,
      content: '<p>Second</p>',
      files: []
    });

    await caller.messages.send({
      channelId: 1,
      content: '<p>Reply to second</p>',
      files: [],
      parentMessageId: secondParentId
    });

    await Bun.sleep(2);

    for (let i = 0; i < 2; i++) {
      await caller.messages.send({
        channelId: 1,
        content: `<p>Reply to first ${i}</p>`,
        files: [],
        parentMessageId: firstParentId
      });
    }

    const { threads, nextCursor } = await caller.threads.getFollowed({});

    expect(nextCursor).toBeNull();
    expect(threads).toMatchObject([
      {
        parentMessageId: firstParentId,
        channelId: 1,
        userId: 1,
        content: '<p>First</p>',
        replyCount: 2
      },
      {
        parentMessageId: secondParentId,
        channelId: 1,
        userId: 1,
        content: '<p>Second</p>',
        replyCount: 1
      }
    ]);
  });

  test('should paginate followed threads', async () => {
    const { caller } = await initTest(1);

    const parentIds: number[] = [];

    for (let i = 0; i < 3; i++) {
      const parentId = await sendMessage(caller, {
        channelId: 1,
        content: `<p>Parent ${i}</p>`,
        files: []
      });

      await caller.messages.send({
        channelId: 1,
        content: '<p>Reply</p>',
        files: [],
        parentMessageId: parentId
      });

      parentIds.push(parentId);
    }

    const firstPage = await caller.threads.getFollowed({ limit: 2 });

    expect(firstPage.nextCursor).not.toBeNull();

    const secondPage = await caller.threads.getFollowed({
      limit: 2,
      cursor: firstPage.nextCursor
    });

    expect(secondPage.nextCursor).toBeNull();
    expect(
      [...firstPage.threads, ...secondPage.threads].map(
        (thread) => thread.parentMessageId
      )
    ).toEqual([...parentIds].reverse());
  });

  test('should leave out threads in channels the caller cannot see', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller2 } = await initTest(2);

    const parentId = await sendMessage(caller1, {
      channelId: 5,
      content: '<p>Parent</p>',
      files: []
    });

    await caller1.messages.send({
      channelId: 5,
      content: mention(2),
      files: [],
      parentMessageId: parentId
    });

    const { threads } = await caller2.threads.getFollowed({});

    expect(threads).toEqual([]);
  });

  test('should reject a limit out of bounds', async () => {
    const { caller } = await initTest(1);

    await expect(caller.threads.getFollowed({ limit: 0 })).rejects.toThrow();
    await expect(caller.threads.getFollowed({ limit: 201 })).rejects.toThrow();
  });
});

describe('thread summaries', () => {
  test('should return the reply count and the most recent distinct repliers', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller2 } = await initTest(2);
    const { caller: caller3 } = await initTest(3);

    const parentId = await sendMessage(caller1, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    for (const caller of [caller2, caller3, caller2, caller1]) {
      await caller.messages.send({
        channelId: 1,
        content: '<p>Reply</p>',
        files: [],
        parentMessageId: parentId
      });
    }

    const { messages } = await caller1.messages.get({ channelId: 1 });
    const parent = messages.find((message) => message.id === parentId);

    expect(parent?.replyCount).toBe(4);
    expect(parent?.replyUserIds).toEqual([1, 2, 3]);

    const fetchedParent = await caller1.messages.getOne({
      messageId: parentId
    });

    expect(fetchedParent.replyUserIds).toEqual([1, 2, 3]);
  });

  test('should cap the repliers at six', async () => {
    const { caller } = await initTest(1);

    const parentId = await sendMessage(caller, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    // user 5 is the moderator, whose role cannot send messages
    for (const userId of [1, 2, 3, 4, 6, 7, 8]) {
      const { caller: replier } = await initTest(userId);

      await replier.messages.send({
        channelId: 1,
        content: '<p>Reply</p>',
        files: [],
        parentMessageId: parentId
      });
    }

    const { threads } = await caller.threads.getFollowed({});
    const thread = threads.find((item) => item.parentMessageId === parentId);

    expect(thread?.replyCount).toBe(7);
    expect(thread?.replyUserIds).toEqual([8, 7, 6, 4, 3, 2]);
  });

  test('should publish the summary when a reply is added', async () => {
    const { caller, disconnect } = await connectOnline(1);

    const parentId = await sendMessage(caller, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    const events: unknown[] = [];

    const subscription = pubsub
      .subscribeFor(1, ServerEvents.THREAD_REPLY_COUNT_UPDATE)
      .subscribe({ next: (event) => events.push(event) });

    await caller.messages.send({
      channelId: 1,
      content: '<p>Reply</p>',
      files: [],
      parentMessageId: parentId
    });

    await Bun.sleep(20);

    subscription.unsubscribe();

    await disconnect();

    expect(events).toEqual([
      { messageId: parentId, channelId: 1, replyCount: 1, replyUserIds: [1] }
    ]);
  });
});

describe('thread unread mentions', () => {
  const MEMBER_ROLE_ID = 2;

  const getReadState = async (userId: number, parentMessageId: number) => {
    const followedThreads = await getFollowedThreads(userId);

    return followedThreads[parentMessageId];
  };

  test('should flag an unread reply that mentions the follower', async () => {
    const { caller } = await initTest(1);

    const parentId = await sendMessage(caller, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    await caller.messages.send({
      channelId: 1,
      content: mention(3),
      files: [],
      parentMessageId: parentId
    });

    expect(await getReadState(3, parentId)).toEqual({
      unreadCount: 1,
      hasUnreadMention: true
    });
  });

  test('should flag an unread reply that mentions a role of the follower', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller3 } = await initTest(3);

    const parentId = await sendMessage(caller3, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    await caller1.messages.send({
      channelId: 1,
      content: roleMention(MEMBER_ROLE_ID),
      files: [],
      parentMessageId: parentId
    });

    expect(await getReadState(3, parentId)).toEqual({
      unreadCount: 1,
      hasUnreadMention: true
    });
  });

  test('should not flag unread replies without a mention of the follower', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller3 } = await initTest(3);

    const parentId = await sendMessage(caller3, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    await caller1.messages.send({
      channelId: 1,
      content: mention(4),
      files: [],
      parentMessageId: parentId
    });

    expect(await getReadState(3, parentId)).toEqual({
      unreadCount: 1,
      hasUnreadMention: false
    });
  });

  test('should clear the flag once the thread is read', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller3 } = await initTest(3);

    const parentId = await sendMessage(caller1, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    await caller1.messages.send({
      channelId: 1,
      content: mention(3),
      files: [],
      parentMessageId: parentId
    });

    await caller3.threads.markAsRead({ parentMessageId: parentId });

    expect(await getReadState(3, parentId)).toEqual({
      unreadCount: 0,
      hasUnreadMention: false
    });
  });

  test('should publish the flag to the mentioned follower', async () => {
    const { caller } = await initTest(1);
    const { disconnect } = await connectOnline(3);

    const parentId = await sendMessage(caller, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    const mentioned = collectFollowUpdates(3);

    await caller.messages.send({
      channelId: 1,
      content: mention(3),
      files: [],
      parentMessageId: parentId
    });

    mentioned.stop();

    await disconnect();

    expect(mentioned.events).toEqual([followed(parentId, 1, true)]);
  });
});

describe('messages.getThread jump windows', () => {
  test('should return a window around a reply, like a channel jump', async () => {
    globalThis.disableRateLimiting = true;

    const { caller } = await initTest(1);

    const parentId = await sendMessage(caller, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    const replyIds: number[] = [];

    for (let i = 0; i < 30; i++) {
      replyIds.push(
        await sendMessage(caller, {
          channelId: 1,
          content: `<p>Reply ${i}</p>`,
          files: [],
          parentMessageId: parentId
        })
      );
    }

    const target = replyIds[0]!;

    const result = await caller.messages.getThread({
      parentMessageId: parentId,
      targetMessageId: target,
      limit: 5
    });

    expect(result.hasNewer).toBe(true);
    expect(result.messages.length).toBeLessThanOrEqual(6);
    expect(result.messages.some((message) => message.id === target)).toBe(true);

    globalThis.disableRateLimiting = false;
  });

  test('should throw when the target is not a reply of this thread', async () => {
    const { caller } = await initTest(1);

    const parentId = await sendMessage(caller, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    const otherParentId = await sendMessage(caller, {
      channelId: 1,
      content: '<p>Other parent</p>',
      files: []
    });

    const otherReplyId = await sendMessage(caller, {
      channelId: 1,
      content: '<p>Other reply</p>',
      files: [],
      parentMessageId: otherParentId
    });

    await expect(
      caller.messages.getThread({
        parentMessageId: parentId,
        targetMessageId: otherReplyId
      })
    ).rejects.toThrow('Target message not found');

    await expect(
      caller.messages.getThread({
        parentMessageId: parentId,
        targetMessageId: otherParentId
      })
    ).rejects.toThrow('Target message not found');
  });
});

describe('message deletes', () => {
  test('should tell clients which thread a deleted reply belonged to', async () => {
    const { caller, disconnect } = await connectOnline(1);

    const parentId = await sendMessage(caller, {
      channelId: 1,
      content: '<p>Parent</p>',
      files: []
    });

    const replyId = await sendMessage(caller, {
      channelId: 1,
      content: '<p>Reply</p>',
      files: [],
      parentMessageId: parentId
    });

    const events: unknown[] = [];

    const subscription = pubsub
      .subscribeFor(1, ServerEvents.MESSAGE_DELETE)
      .subscribe({ next: (event) => events.push(event) });

    await caller.messages.delete({ messageId: replyId });
    await caller.messages.delete({ messageId: parentId });

    await Bun.sleep(20);

    subscription.unsubscribe();

    await disconnect();

    expect(events).toEqual([
      { messageId: replyId, channelId: 1, parentMessageId: parentId },
      { messageId: parentId, channelId: 1, parentMessageId: null }
    ]);
  });
});

describe('thread behaviour', () => {
  const MEMBER_ROLE_ID = 2;

  const getReadState = async (userId: number, parentMessageId: number) => {
    const followedThreads = await getFollowedThreads(userId);

    return followedThreads[parentMessageId];
  };

  const reply = (
    caller: Awaited<ReturnType<typeof initTest>>['caller'],
    parentMessageId: number,
    content = '<p>Reply</p>',
    channelId = 1
  ) =>
    sendMessage(caller, {
      channelId,
      content,
      files: [],
      parentMessageId
    });

  const root = (
    caller: Awaited<ReturnType<typeof initTest>>['caller'],
    content = '<p>Parent</p>',
    channelId = 1
  ) => sendMessage(caller, { channelId, content, files: [] });

  test('a thread page holds only the replies of that thread', async () => {
    const { caller } = await initTest(1);

    const parentId = await root(caller);
    const otherParentId = await root(caller);
    const replyId = await reply(caller, parentId);

    await reply(caller, otherParentId);

    const { messages } = await caller.messages.getThread({
      parentMessageId: parentId
    });

    expect(messages.map((message) => message.id)).toEqual([replyId]);
  });

  test('a channel jump window never pulls thread replies into the channel', async () => {
    const { caller } = await initTest(1);

    const parentId = await root(caller);

    for (let i = 0; i < 5; i++) {
      await reply(caller, parentId);
    }

    const { messages } = await caller.messages.get({
      channelId: 1,
      targetMessageId: parentId
    });

    expect(messages.every((message) => message.parentMessageId === null)).toBe(
      true
    );
  });

  test('a thread jump window pages upward to the oldest reply without overlap or gaps', async () => {
    globalThis.disableRateLimiting = true;

    const { caller } = await initTest(1);

    const parentId = await root(caller);
    const replyIds: number[] = [];

    for (let i = 0; i < 40; i++) {
      replyIds.push(await reply(caller, parentId, `<p>${i}</p>`));
    }

    const window = await caller.messages.getThread({
      parentMessageId: parentId,
      targetMessageId: replyIds[30]!,
      limit: 50
    });

    const seen = window.messages.map((message) => message.id);
    let cursor = window.nextCursor;

    while (cursor) {
      const page = await caller.messages.getThread({
        parentMessageId: parentId,
        cursor,
        limit: 5
      });

      seen.push(...page.messages.map((message) => message.id));
      cursor = page.nextCursor;
    }

    expect([...seen].sort((a, b) => a - b)).toEqual(replyIds);

    globalThis.disableRateLimiting = false;
  });

  test('a message without replies reports an empty summary, not a missing one', async () => {
    const { caller } = await initTest(1);

    const parentId = await root(caller);

    const { messages } = await caller.messages.get({ channelId: 1 });
    const parent = messages.find((message) => message.id === parentId);

    expect(parent?.replyCount).toBe(0);
    expect(parent?.replyUserIds).toEqual([]);
  });

  test('deleting a reply updates the summary, dropping a replier with no replies left', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller2 } = await initTest(2);

    const parentId = await root(caller1);

    await reply(caller1, parentId);
    const lonelyReplyId = await reply(caller2, parentId);

    await caller2.messages.delete({ messageId: lonelyReplyId });

    const { messages } = await caller1.messages.get({ channelId: 1 });
    const parent = messages.find((message) => message.id === parentId);

    expect(parent?.replyCount).toBe(1);
    expect(parent?.replyUserIds).toEqual([1]);
  });

  test('a reply moves its thread to the top of the followed list', async () => {
    const { caller } = await initTest(1);

    const olderParentId = await root(caller);
    await reply(caller, olderParentId);

    await Bun.sleep(2);

    const newerParentId = await root(caller);
    await reply(caller, newerParentId);

    await Bun.sleep(2);

    await reply(caller, olderParentId);

    const { threads } = await caller.threads.getFollowed({});

    expect(threads.map((thread) => thread.parentMessageId)).toEqual([
      olderParentId,
      newerParentId
    ]);
  });

  test('being mentioned again after unfollowing follows the thread again', async () => {
    const { caller } = await initTest(1);
    const { caller: caller3 } = await initTest(3);

    const parentId = await root(caller);

    await reply(caller, parentId, mention(3));
    await caller3.threads.setFollow({
      parentMessageId: parentId,
      follow: false
    });

    expect(await getReadState(3, parentId)).toBeUndefined();

    await reply(caller, parentId, mention(3));

    expect(await getReadState(3, parentId)).toEqual({
      unreadCount: 1,
      hasUnreadMention: true
    });
  });

  test('a reply that is edited to mention a follower flags it as an unread mention', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller3 } = await initTest(3);

    const parentId = await root(caller3);
    const replyId = await reply(caller1, parentId);

    expect((await getReadState(3, parentId))?.hasUnreadMention).toBe(false);

    await caller1.messages.edit({ messageId: replyId, content: mention(3) });

    expect((await getReadState(3, parentId))?.hasUnreadMention).toBe(true);
  });

  test('a follower who is online sees the badge turn red when a reply is edited to mention them', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller3, disconnect } = await connectOnline(3);

    const parentId = await root(caller3);
    const replyId = await reply(caller1, parentId);

    const updates = collectFollowUpdates(3);

    await caller1.messages.edit({ messageId: replyId, content: mention(3) });
    await Bun.sleep(20);

    updates.stop();
    await disconnect();

    expect(updates.events.at(-1)).toMatchObject({
      parentMessageId: parentId,
      hasUnreadMention: true
    });
  });

  test('a reply that is edited to mention someone makes them follow the thread', async () => {
    const { caller } = await initTest(1);

    const parentId = await root(caller);
    const replyId = await reply(caller, parentId);

    await caller.messages.edit({ messageId: replyId, content: mention(3) });

    expect(await getReadState(3, parentId)).toBeDefined();
  });

  test('a mention the follower already read does not keep the badge red', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller3 } = await initTest(3);

    const parentId = await root(caller3);

    await reply(caller1, parentId, mention(3));
    await caller3.threads.markAsRead({ parentMessageId: parentId });
    await reply(caller1, parentId);

    expect(await getReadState(3, parentId)).toEqual({
      unreadCount: 1,
      hasUnreadMention: false
    });
  });

  test('a mention of a role the follower does not have is not their mention', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller3 } = await initTest(3);

    const parentId = await root(caller3);

    // role 1 is the owner role, user 3 is a plain member
    await reply(caller1, parentId, roleMention(1));

    expect(await getReadState(3, parentId)).toEqual({
      unreadCount: 1,
      hasUnreadMention: false
    });

    await reply(caller1, parentId, roleMention(MEMBER_ROLE_ID));

    expect((await getReadState(3, parentId))?.hasUnreadMention).toBe(true);
  });

  test('mentioning someone outside a dm in a dm thread never shows them the thread', async () => {
    const { caller: caller3 } = await initTest(3);

    // channel 3 is the dm between users 3 and 4, user 2 is not part of it
    const parentId = await root(caller3, '<p>Parent</p>', 3);

    await reply(caller3, parentId, mention(2), 3);

    const { caller: caller2 } = await initTest(2);
    const { threads } = await caller2.threads.getFollowed({});

    expect(await getReadState(2, parentId)).toBeUndefined();
    expect(threads).toEqual([]);
  });

  test('a deleted parent leaves no thread behind for its followers', async () => {
    const { caller } = await initTest(1);

    const parentId = await root(caller);

    await reply(caller, parentId);
    await caller.messages.delete({ messageId: parentId });

    const { threads } = await caller.threads.getFollowed({});

    expect(threads.some((thread) => thread.parentMessageId === parentId)).toBe(
      false
    );
    await expect(
      caller.messages.getThread({ parentMessageId: parentId })
    ).rejects.toThrow('Parent message not found');
  });

  test('mention attributes typed as plain text are not a mention', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller3 } = await initTest(3);

    const parentId = await root(caller3);

    await reply(
      caller1,
      parentId,
      `<p>data-type="mention" data-user-id="3" data-role-id="${MEMBER_ROLE_ID}"</p>`
    );

    expect(await getReadState(3, parentId)).toEqual({
      unreadCount: 1,
      hasUnreadMention: false
    });
  });

  test('a span carrying a user id without the mention type is not a mention', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller3 } = await initTest(3);

    const parentId = await root(caller3);

    await reply(caller1, parentId, '<p><span data-user-id="3">hi</span></p>');

    expect(await getReadState(3, parentId)).toEqual({
      unreadCount: 1,
      hasUnreadMention: false
    });
  });

  test('deleting the only unread reply that mentions a follower clears their badge', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller3 } = await initTest(3);

    const parentId = await root(caller3);

    await reply(caller1, parentId);

    const mentionId = await reply(caller1, parentId, mention(3));

    await caller1.messages.delete({ messageId: mentionId });

    expect(await getReadState(3, parentId)).toEqual({
      unreadCount: 1,
      hasUnreadMention: false
    });
  });

  test('deleting one of two unread replies that mention a follower keeps their badge red', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller3 } = await initTest(3);

    const parentId = await root(caller3);
    const firstMentionId = await reply(caller1, parentId, mention(3));

    await reply(caller1, parentId, roleMention(MEMBER_ROLE_ID));
    await caller1.messages.delete({ messageId: firstMentionId });

    expect(await getReadState(3, parentId)).toEqual({
      unreadCount: 1,
      hasUnreadMention: true
    });
  });

  test('editing away the only unread mention of a follower clears their badge', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller3 } = await initTest(3);

    const parentId = await root(caller3);
    const mentionId = await reply(caller1, parentId, mention(3));

    await caller1.messages.edit({
      messageId: mentionId,
      content: '<p>Reply</p>'
    });

    expect(await getReadState(3, parentId)).toEqual({
      unreadCount: 1,
      hasUnreadMention: false
    });
  });

  test('a follower who replies has read the mention before their reply', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller3 } = await initTest(3);

    const parentId = await root(caller3);

    await reply(caller1, parentId, mention(3));
    await reply(caller3, parentId);

    expect(await getReadState(3, parentId)).toEqual({
      unreadCount: 0,
      hasUnreadMention: false
    });
  });

  test('the unread count stops at 100, past what the badge shows', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller3 } = await initTest(3);

    const parentId = await root(caller3);

    // the first reply goes through the route so the parent's author follows the thread, the
    // rest are inserted directly since the send rate limit would stop them
    await reply(caller1, parentId);

    const now = Date.now();

    await tdb.insert(messages).values(
      Array.from({ length: 104 }, (_, index) => ({
        channelId: 1,
        userId: 1,
        parentMessageId: parentId,
        content: '<p>Reply</p>',
        createdAt: now + index
      }))
    );

    expect(await getUnreadCount(3, parentId)).toBe(100);
  });
});
