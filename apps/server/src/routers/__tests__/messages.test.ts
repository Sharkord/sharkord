import { Permission } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { initTest, uploadFile } from '../../__tests__/helpers';
import { tdb } from '../../__tests__/setup';
import { rolePermissions, settings } from '../../db/schema';

describe('messages router', () => {
  test('should throw when user lacks permissions (edit - not own message)', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller2 } = await initTest(2);

    await caller1.messages.send({
      channelId: 1,
      content: 'Original message',
      files: []
    });

    const messages = await caller1.messages.get({
      channelId: 1,
      cursor: null,
      limit: 50
    });

    const messageId = messages.messages[0]!.id;

    await expect(
      caller2.messages.edit({
        messageId,
        content: 'Edited message'
      })
    ).rejects.toThrow('You do not have permission to edit this message');
  });

  test('should throw when user lacks permissions (delete - not own message)', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller2 } = await initTest(2);

    await caller1.messages.send({
      channelId: 1,
      content: 'Message to delete',
      files: []
    });

    const messages = await caller1.messages.get({
      channelId: 1,
      cursor: null,
      limit: 50
    });

    const messageId = messages.messages[0]!.id;

    await expect(
      caller2.messages.delete({
        messageId
      })
    ).rejects.toThrow('You do not have permission to delete this message');
  });

  test('should throw when user lacks permissions (toggleReaction)', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller2 } = await initTest(2);

    await caller1.messages.send({
      channelId: 1,
      content: 'Message to react to',
      files: []
    });

    const messages = await caller1.messages.get({
      channelId: 1,
      cursor: null,
      limit: 50
    });

    const messageId = messages.messages[0]!.id;

    await expect(
      caller2.messages.toggleReaction({
        messageId,
        emoji: '👍'
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should send a new message', async () => {
    const { caller } = await initTest();

    await caller.messages.send({
      channelId: 1,
      content: 'Test message content',
      files: []
    });

    const messages = await caller.messages.get({
      channelId: 1,
      cursor: null,
      limit: 50
    });

    expect(messages.messages).toBeDefined();
    expect(messages.messages.length).toBeGreaterThan(0);

    const sentMessage = messages.messages[0];

    expect(sentMessage!.content).toBe('Test message content');
    expect(sentMessage!.channelId).toBe(1);
    expect(sentMessage!.userId).toBe(1);
  });

  test('should get messages from channel', async () => {
    const { caller } = await initTest();

    await caller.messages.send({
      channelId: 2,
      content: 'Message 1',
      files: []
    });

    await caller.messages.send({
      channelId: 2,
      content: 'Message 2',
      files: []
    });

    await caller.messages.send({
      channelId: 2,
      content: 'Message 3',
      files: []
    });

    const result = await caller.messages.get({
      channelId: 2,
      cursor: null,
      limit: 50
    });

    expect(result.messages).toBeDefined();
    expect(Array.isArray(result.messages)).toBe(true);
    expect(result.messages.length).toBe(3);
  });

  test('should edit own message', async () => {
    const { caller } = await initTest();

    await caller.messages.send({
      channelId: 1,
      content: 'Original content',
      files: []
    });

    const messagesBefore = await caller.messages.get({
      channelId: 1,
      cursor: null,
      limit: 50
    });

    const messageId = messagesBefore.messages[0]!.id;

    await caller.messages.edit({
      messageId,
      content: 'Edited content'
    });

    const messagesAfter = await caller.messages.get({
      channelId: 1,
      cursor: null,
      limit: 50
    });

    const editedMessage = messagesAfter.messages.find(
      (m) => m.id === messageId
    );

    expect(editedMessage).toBeDefined();
    expect(editedMessage!.content).toBe('Edited content');
    expect(editedMessage!.updatedAt).toBeDefined();
    expect(editedMessage!.updatedAt).not.toBeNull();
  });

  test('should allow admin to edit any message', async () => {
    const { caller: caller2 } = await initTest(2);
    const { caller: caller1 } = await initTest(1);

    await caller2.messages.send({
      channelId: 1,
      content: 'User 2 message',
      files: []
    });

    const messages = await caller1.messages.get({
      channelId: 1,
      cursor: null,
      limit: 50
    });

    const messageId = messages.messages[0]!.id;

    await caller1.messages.edit({
      messageId,
      content: 'Edited by admin'
    });

    const messagesAfter = await caller1.messages.get({
      channelId: 1,
      cursor: null,
      limit: 50
    });

    const editedMessage = messagesAfter.messages.find(
      (m) => m.id === messageId
    );

    expect(editedMessage!.content).toBe('Edited by admin');
  });

  test('should delete own message', async () => {
    const { caller } = await initTest();

    await caller.messages.send({
      channelId: 1,
      content: 'Message to delete',
      files: []
    });

    const messagesBefore = await caller.messages.get({
      channelId: 1,
      cursor: null,
      limit: 50
    });

    const messageId = messagesBefore.messages[0]!.id;
    const messageCountBefore = messagesBefore.messages.length;

    await caller.messages.delete({
      messageId
    });

    const messagesAfter = await caller.messages.get({
      channelId: 1,
      cursor: null,
      limit: 50
    });

    expect(
      messagesAfter.messages.find((m) => m.id === messageId)
    ).toBeUndefined();
    expect(messagesAfter.messages.length).toBe(messageCountBefore - 1);
  });

  test('should allow admin to delete any message', async () => {
    const { caller: caller2 } = await initTest(2);
    const { caller: caller1 } = await initTest(1);

    await caller2.messages.send({
      channelId: 1,
      content: 'User 2 message to delete',
      files: []
    });

    const messages = await caller1.messages.get({
      channelId: 1,
      cursor: null,
      limit: 50
    });

    const messageId = messages.messages[0]!.id;

    await caller1.messages.delete({
      messageId
    });

    const messagesAfter = await caller1.messages.get({
      channelId: 1,
      cursor: null,
      limit: 50
    });

    expect(
      messagesAfter.messages.find((m) => m.id === messageId)
    ).toBeUndefined();
  });

  test('should throw when editing non-existing message', async () => {
    const { caller } = await initTest();

    await expect(
      caller.messages.edit({
        messageId: 999999,
        content: 'Edited content'
      })
    ).rejects.toThrow('Message not found');
  });

  test('should throw when deleting non-existing message', async () => {
    const { caller } = await initTest();

    await expect(
      caller.messages.delete({
        messageId: 999999
      })
    ).rejects.toThrow('Message not found');
  });

  test('should toggle reaction on message', async () => {
    const { caller } = await initTest();

    await caller.messages.send({
      channelId: 1,
      content: 'Message to react to',
      files: []
    });

    const messages = await caller.messages.get({
      channelId: 1,
      cursor: null,
      limit: 50
    });

    const messageId = messages.messages[0]!.id;

    await caller.messages.toggleReaction({
      messageId,
      emoji: '👍'
    });

    const messagesAfterAdd = await caller.messages.get({
      channelId: 1,
      cursor: null,
      limit: 50
    });

    const messageWithReaction = messagesAfterAdd.messages.find(
      (m) => m.id === messageId
    );

    expect(messageWithReaction!.reactions).toBeDefined();
    expect(messageWithReaction!.reactions.length).toBe(1);
    expect(messageWithReaction!.reactions[0]!.emoji).toBe('👍');
    expect(messageWithReaction!.reactions[0]!.userId).toBe(1);

    await caller.messages.toggleReaction({
      messageId,
      emoji: '👍'
    });

    const messagesAfterRemove = await caller.messages.get({
      channelId: 1,
      cursor: null,
      limit: 50
    });

    const messageWithoutReaction = messagesAfterRemove.messages.find(
      (m) => m.id === messageId
    );

    expect(messageWithoutReaction!.reactions.length).toBe(0);
  });

  test('should allow multiple users to react to the same message', async () => {
    const { caller: caller1 } = await initTest(1);

    await caller1.messages.send({
      channelId: 1,
      content: 'Message for multiple reactions',
      files: []
    });

    const messages = await caller1.messages.get({
      channelId: 1,
      cursor: null,
      limit: 50
    });

    const messageId = messages.messages[0]!.id;

    await caller1.messages.toggleReaction({
      messageId,
      emoji: '👍'
    });

    await caller1.messages.toggleReaction({
      messageId,
      emoji: '❤️'
    });

    const messagesAfter = await caller1.messages.get({
      channelId: 1,
      cursor: null,
      limit: 50
    });

    const messageWithReactions = messagesAfter.messages.find(
      (m) => m.id === messageId
    );

    expect(messageWithReactions!.reactions.length).toBe(2);

    const emojis = messageWithReactions!.reactions.map((r) => r.emoji);

    expect(emojis).toContain('👍');
    expect(emojis).toContain('❤️');
  });

  test('should allow multiple different reactions on the same message', async () => {
    const { caller } = await initTest();

    await caller.messages.send({
      channelId: 1,
      content: 'Message for different reactions',
      files: []
    });

    const messages = await caller.messages.get({
      channelId: 1,
      cursor: null,
      limit: 50
    });

    const messageId = messages.messages[0]!.id;

    await caller.messages.toggleReaction({
      messageId,
      emoji: '👍'
    });

    await caller.messages.toggleReaction({
      messageId,
      emoji: '❤️'
    });

    await caller.messages.toggleReaction({
      messageId,
      emoji: '😂'
    });

    const messagesAfter = await caller.messages.get({
      channelId: 1,
      cursor: null,
      limit: 50
    });

    const messageWithReactions = messagesAfter.messages.find(
      (m) => m.id === messageId
    );

    expect(messageWithReactions!.reactions.length).toBe(3);

    const emojis = messageWithReactions!.reactions.map((r) => r.emoji);

    expect(emojis).toContain('👍');
    expect(emojis).toContain('❤️');
    expect(emojis).toContain('😂');
  });

  test('should send multiple messages', async () => {
    const { caller } = await initTest();

    const messageCount = 5;
    const promises = [];

    for (let i = 0; i < messageCount; i++) {
      promises.push(
        caller.messages.send({
          channelId: 2,
          content: `Message ${i + 1}`,
          files: []
        })
      );
    }

    await Promise.all(promises);

    const messages = await caller.messages.get({
      channelId: 2,
      cursor: null,
      limit: 50
    });

    expect(messages.messages.length).toBe(messageCount);
  });

  test('should signal typing in channel', async () => {
    const { caller } = await initTest();

    await caller.messages.signalTyping({
      channelId: 1
    });
  });

  test('should throw when user lacks permissions (signalTyping)', async () => {
    const { caller } = await initTest(2);

    await tdb
      .delete(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, 2),
          eq(rolePermissions.permission, Permission.SEND_MESSAGES)
        )
      );

    await expect(
      caller.messages.signalTyping({
        channelId: 1
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should paginate messages with cursor', async () => {
    const { caller } = await initTest();

    // send 10 messages
    for (let i = 0; i < 10; i++) {
      await caller.messages.send({
        channelId: 1,
        content: `Message ${i + 1}`,
        files: []
      });
    }

    // get first page
    const firstPage = await caller.messages.get({
      channelId: 1,
      cursor: null,
      limit: 5
    });

    expect(firstPage.messages.length).toBe(5);
    expect(firstPage.nextCursor).toBeDefined();
    expect(firstPage.nextCursor).not.toBeNull();

    // get second page
    const secondPage = await caller.messages.get({
      channelId: 1,
      cursor: firstPage.nextCursor,
      limit: 5
    });

    expect(secondPage.messages.length).toBeGreaterThan(0);

    // ensure no overlap between pages
    const firstPageIds = firstPage.messages.map((m) => m.id);
    const secondPageIds = secondPage.messages.map((m) => m.id);

    const intersection = firstPageIds.filter((id) =>
      secondPageIds.includes(id)
    );

    expect(intersection.length).toBe(0);
  });

  test('should return empty messages for empty channel', async () => {
    const { caller } = await initTest();

    const messages = await caller.messages.get({
      channelId: 2,
      cursor: null,
      limit: 50
    });

    expect(messages.messages).toBeDefined();
    expect(Array.isArray(messages.messages)).toBe(true);
    expect(messages.nextCursor).toBeNull();
  });

  test('should send message with empty files array', async () => {
    const { caller } = await initTest();

    await caller.messages.send({
      channelId: 1,
      content: 'Message without files',
      files: []
    });

    const messages = await caller.messages.get({
      channelId: 1,
      cursor: null,
      limit: 50
    });

    const sentMessage = messages.messages[0];

    expect(sentMessage!.content).toBe('Message without files');
    expect(sentMessage!.files).toBeDefined();
    expect(sentMessage!.files.length).toBe(0);
  });

  test('should trim attached files to configured max files per message', async () => {
    const { caller, mockedToken } = await initTest();

    await tdb
      .update(settings)
      .set({
        storageMaxFilesPerMessage: 2
      })
      .execute();

    const file1 = new File(['file one'], 'one.txt', { type: 'text/plain' });
    const file2 = new File(['file two'], 'two.txt', { type: 'text/plain' });
    const file3 = new File(['file three'], 'three.txt', { type: 'text/plain' });

    const response1 = await uploadFile(file1, mockedToken);
    const response2 = await uploadFile(file2, mockedToken);
    const response3 = await uploadFile(file3, mockedToken);

    const temp1 = (await response1.json()) as { id: string };
    const temp2 = (await response2.json()) as { id: string };
    const temp3 = (await response3.json()) as { id: string };

    const messageId = await caller.messages.send({
      channelId: 1,
      content: 'Message with limited attachments',
      files: [temp1.id, temp2.id, temp3.id]
    });

    const messages = await caller.messages.get({
      channelId: 1,
      cursor: null,
      limit: 50
    });

    const sentMessage = messages.messages.find((m) => m.id === messageId);

    expect(sentMessage).toBeDefined();
    expect(sentMessage!.files.length).toBe(2);

    const names = sentMessage!.files.map((f) => f.originalName);

    expect(names).toContain('one.txt');
    expect(names).toContain('two.txt');
    expect(names).not.toContain('three.txt');
  });

  test('should discard all attached files when max files per message is 0', async () => {
    const { caller, mockedToken } = await initTest();

    await tdb
      .update(settings)
      .set({
        storageMaxFilesPerMessage: 0
      })
      .execute();

    const file1 = new File(['file one'], 'one.txt', { type: 'text/plain' });
    const file2 = new File(['file two'], 'two.txt', { type: 'text/plain' });

    const response1 = await uploadFile(file1, mockedToken);
    const response2 = await uploadFile(file2, mockedToken);

    const temp1 = (await response1.json()) as { id: string };
    const temp2 = (await response2.json()) as { id: string };

    const messageId = await caller.messages.send({
      channelId: 1,
      content: 'Message with files while limit is zero',
      files: [temp1.id, temp2.id]
    });

    const messages = await caller.messages.get({
      channelId: 1,
      cursor: null,
      limit: 50
    });

    const sentMessage = messages.messages.find((m) => m.id === messageId);

    expect(sentMessage).toBeDefined();
    expect(sentMessage!.files.length).toBe(0);
  });

  test('should update message updatedAt timestamp on edit', async () => {
    const { caller } = await initTest();

    await caller.messages.send({
      channelId: 1,
      content: 'Original message',
      files: []
    });

    const messagesBefore = await caller.messages.get({
      channelId: 1,
      cursor: null,
      limit: 50
    });

    const messageId = messagesBefore.messages[0]!.id;
    const originalUpdatedAt = messagesBefore.messages[0]!.updatedAt;

    await Bun.sleep(10);

    await caller.messages.edit({
      messageId,
      content: 'Edited message'
    });

    const messagesAfter = await caller.messages.get({
      channelId: 1,
      cursor: null,
      limit: 50
    });

    const editedMessage = messagesAfter.messages.find(
      (m) => m.id === messageId
    );

    expect(editedMessage!.updatedAt).toBeDefined();
    expect(editedMessage!.updatedAt).not.toBe(originalUpdatedAt);
    expect(editedMessage!.updatedAt).toBeGreaterThan(
      originalUpdatedAt ?? editedMessage!.createdAt
    );
  });

  test('should rate limit excessive send message attempts', async () => {
    const { caller } = await initTest(1);

    for (let i = 0; i < 15; i++) {
      await caller.messages.send({
        channelId: 1,
        content: `Message ${i}`,
        files: []
      });
    }

    await expect(
      caller.messages.send({
        channelId: 1,
        content: 'One too many',
        files: []
      })
    ).rejects.toThrow('Too many requests. Please try again shortly.');
  });

  test('should rate limit excessive edit message attempts', async () => {
    const { caller } = await initTest(1);

    const messageId = await caller.messages.send({
      channelId: 1,
      content: 'Message to edit',
      files: []
    });

    for (let i = 0; i < 15; i++) {
      await caller.messages.edit({
        messageId,
        content: `Edit ${i}`
      });
    }

    await expect(
      caller.messages.edit({
        messageId,
        content: 'One too many'
      })
    ).rejects.toThrow('Too many requests. Please try again shortly.');
  });

  test('should send a thread reply to a root message', async () => {
    const { caller } = await initTest();

    const parentId = await caller.messages.send({
      channelId: 1,
      content: 'Parent message',
      files: []
    });

    await caller.messages.send({
      channelId: 1,
      content: 'Thread reply',
      files: [],
      parentMessageId: parentId
    });

    const thread = await caller.messages.getThread({
      parentMessageId: parentId,
      cursor: null,
      limit: 50
    });

    expect(thread.messages.length).toBe(1);
    expect(thread.messages[0]!.content).toBe('Thread reply');
    expect(thread.messages[0]!.parentMessageId).toBe(parentId);
  });

  test('should not include thread replies in channel messages', async () => {
    const { caller } = await initTest();

    const parentId = await caller.messages.send({
      channelId: 2,
      content: 'Root message',
      files: []
    });

    await caller.messages.send({
      channelId: 2,
      content: 'Reply 1',
      files: [],
      parentMessageId: parentId
    });

    await caller.messages.send({
      channelId: 2,
      content: 'Reply 2',
      files: [],
      parentMessageId: parentId
    });

    const channelMessages = await caller.messages.get({
      channelId: 2,
      cursor: null,
      limit: 50
    });

    // only the root message should appear, not the replies
    expect(channelMessages.messages.length).toBe(1);
    expect(channelMessages.messages[0]!.content).toBe('Root message');
  });

  test('should include reply count on root messages', async () => {
    const { caller } = await initTest();

    const parentId = await caller.messages.send({
      channelId: 2,
      content: 'Root with replies',
      files: []
    });

    await caller.messages.send({
      channelId: 2,
      content: 'Reply 1',
      files: [],
      parentMessageId: parentId
    });

    await caller.messages.send({
      channelId: 2,
      content: 'Reply 2',
      files: [],
      parentMessageId: parentId
    });

    await caller.messages.send({
      channelId: 2,
      content: 'Reply 3',
      files: [],
      parentMessageId: parentId
    });

    const channelMessages = await caller.messages.get({
      channelId: 2,
      cursor: null,
      limit: 50
    });

    const rootMessage = channelMessages.messages.find((m) => m.id === parentId);

    expect(rootMessage).toBeDefined();
    expect(rootMessage!.replyCount).toBe(3);
  });

  test('should return empty thread for message with no replies', async () => {
    const { caller } = await initTest();

    const parentId = await caller.messages.send({
      channelId: 1,
      content: 'No replies here',
      files: []
    });

    const thread = await caller.messages.getThread({
      parentMessageId: parentId,
      cursor: null,
      limit: 50
    });

    expect(thread.messages.length).toBe(0);
    expect(thread.nextCursor).toBeNull();
  });

  test('should throw when sending a reply to a non-existing parent', async () => {
    const { caller } = await initTest();

    await expect(
      caller.messages.send({
        channelId: 1,
        content: 'Orphan reply',
        files: [],
        parentMessageId: 999999
      })
    ).rejects.toThrow('Parent message not found');
  });

  test('should throw when sending a reply to a message in a different channel', async () => {
    const { caller } = await initTest();

    const parentId = await caller.messages.send({
      channelId: 1,
      content: 'Message in channel 1',
      files: []
    });

    await expect(
      caller.messages.send({
        channelId: 2,
        content: 'Reply targeting wrong channel',
        files: [],
        parentMessageId: parentId
      })
    ).rejects.toThrow('Parent message must be in the same channel');
  });

  test('should throw when replying to a thread reply (nested threads)', async () => {
    const { caller } = await initTest();

    const parentId = await caller.messages.send({
      channelId: 1,
      content: 'Root message',
      files: []
    });

    const replyId = await caller.messages.send({
      channelId: 1,
      content: 'First-level reply',
      files: [],
      parentMessageId: parentId
    });

    await expect(
      caller.messages.send({
        channelId: 1,
        content: 'Nested reply attempt',
        files: [],
        parentMessageId: replyId
      })
    ).rejects.toThrow(
      'Cannot reply to a thread reply. Threads are only one level deep.'
    );
  });

  test('should throw when getting thread for non-existing parent', async () => {
    const { caller } = await initTest();

    await expect(
      caller.messages.getThread({
        parentMessageId: 999999,
        cursor: null,
        limit: 50
      })
    ).rejects.toThrow('Parent message not found');
  });

  test('should throw when getting thread for a reply message', async () => {
    const { caller } = await initTest();

    const parentId = await caller.messages.send({
      channelId: 1,
      content: 'Root message',
      files: []
    });

    const replyId = await caller.messages.send({
      channelId: 1,
      content: 'Reply message',
      files: [],
      parentMessageId: parentId
    });

    await expect(
      caller.messages.getThread({
        parentMessageId: replyId,
        cursor: null,
        limit: 50
      })
    ).rejects.toThrow('Cannot get thread for a reply message');
  });

  test('should paginate thread messages', async () => {
    const { caller } = await initTest();

    const parentId = await caller.messages.send({
      channelId: 1,
      content: 'Root for pagination',
      files: []
    });

    for (let i = 0; i < 10; i++) {
      await caller.messages.send({
        channelId: 1,
        content: `Thread reply ${i + 1}`,
        files: [],
        parentMessageId: parentId
      });
    }

    const firstPage = await caller.messages.getThread({
      parentMessageId: parentId,
      cursor: null,
      limit: 5
    });

    expect(firstPage.messages.length).toBe(5);
    expect(firstPage.nextCursor).not.toBeNull();

    const secondPage = await caller.messages.getThread({
      parentMessageId: parentId,
      cursor: firstPage.nextCursor,
      limit: 5
    });

    expect(secondPage.messages.length).toBeGreaterThan(0);

    // no overlap between pages
    const firstPageIds = firstPage.messages.map((m) => m.id);
    const secondPageIds = secondPage.messages.map((m) => m.id);
    const intersection = firstPageIds.filter((id) =>
      secondPageIds.includes(id)
    );

    expect(intersection.length).toBe(0);
  });

  test('should return thread messages in ascending order (oldest first)', async () => {
    const { caller } = await initTest();

    const parentId = await caller.messages.send({
      channelId: 1,
      content: 'Root message',
      files: []
    });

    for (let i = 0; i < 3; i++) {
      await caller.messages.send({
        channelId: 1,
        content: `Reply ${i + 1}`,
        files: [],
        parentMessageId: parentId
      });
    }

    const thread = await caller.messages.getThread({
      parentMessageId: parentId,
      cursor: null,
      limit: 50
    });

    expect(thread.messages.length).toBe(3);

    for (let i = 1; i < thread.messages.length; i++) {
      expect(thread.messages[i]!.createdAt).toBeGreaterThanOrEqual(
        thread.messages[i - 1]!.createdAt
      );
    }
  });

  test('should delete a thread reply', async () => {
    const { caller } = await initTest();

    const parentId = await caller.messages.send({
      channelId: 1,
      content: 'Root message',
      files: []
    });

    const replyId = await caller.messages.send({
      channelId: 1,
      content: 'Reply to delete',
      files: [],
      parentMessageId: parentId
    });

    await caller.messages.delete({ messageId: replyId });

    const thread = await caller.messages.getThread({
      parentMessageId: parentId,
      cursor: null,
      limit: 50
    });

    expect(thread.messages.find((m) => m.id === replyId)).toBeUndefined();
  });

  test('should update reply count after deleting a thread reply', async () => {
    const { caller } = await initTest();

    const parentId = await caller.messages.send({
      channelId: 2,
      content: 'Root message',
      files: []
    });

    const replyId = await caller.messages.send({
      channelId: 2,
      content: 'Reply 1',
      files: [],
      parentMessageId: parentId
    });

    await caller.messages.send({
      channelId: 2,
      content: 'Reply 2',
      files: [],
      parentMessageId: parentId
    });

    // should start with 2 replies
    let channelMessages = await caller.messages.get({
      channelId: 2,
      cursor: null,
      limit: 50
    });

    expect(
      channelMessages.messages.find((m) => m.id === parentId)!.replyCount
    ).toBe(2);

    // delete one reply
    await caller.messages.delete({ messageId: replyId });

    channelMessages = await caller.messages.get({
      channelId: 2,
      cursor: null,
      limit: 50
    });

    expect(
      channelMessages.messages.find((m) => m.id === parentId)!.replyCount
    ).toBe(1);
  });

  test('should reject file attachments in direct messages when disabled', async () => {
    const { caller: caller1, mockedToken } = await initTest(1);

    const { channelId } = await caller1.dms.open({ userId: 2 });

    await tdb
      .update(settings)
      .set({
        storageFileSharingInDirectMessages: false
      })
      .execute();

    const file = new File(['dm attachment'], 'dm.txt', {
      type: 'text/plain'
    });

    const uploadResponse = await uploadFile(file, mockedToken);
    const uploaded = (await uploadResponse.json()) as { id: string };

    await expect(
      caller1.messages.send({
        channelId,
        content: 'hello with file',
        files: [uploaded.id]
      })
    ).rejects.toThrow(
      'File sharing in direct messages is disabled on this server'
    );
  });

  test('should reject sending and fetching direct messages when dms are disabled', async () => {
    const { caller: caller1 } = await initTest(1);

    const { channelId } = await caller1.dms.open({ userId: 2 });

    await tdb
      .update(settings)
      .set({
        directMessagesEnabled: false
      })
      .execute();

    await expect(
      caller1.messages.send({
        channelId,
        content: 'blocked dm',
        files: []
      })
    ).rejects.toThrow('Direct messages are disabled on this server');

    await expect(
      caller1.messages.get({
        channelId,
        cursor: null,
        limit: 50
      })
    ).rejects.toThrow('Direct messages are disabled on this server');
  });

  test('should throw when non-participant tries to fetch direct messages', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller3 } = await initTest(3);

    const { channelId } = await caller1.dms.open({ userId: 2 });

    await expect(
      caller3.messages.get({
        channelId,
        cursor: null,
        limit: 50
      })
    ).rejects.toThrow('You are not a participant in this DM channel');
  });

  test('should throw when non-participant tries to send message in direct messages', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller3 } = await initTest(3);

    const { channelId } = await caller1.dms.open({ userId: 2 });

    await expect(
      caller3.messages.send({
        channelId,
        content: 'Intruding DM',
        files: []
      })
    ).rejects.toThrow('Insufficient channel permissions');
  });

  test('should throw when non-participant tries to signal typing in direct messages', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller3 } = await initTest(3);

    const { channelId } = await caller1.dms.open({ userId: 2 });

    await expect(
      caller3.messages.signalTyping({
        channelId
      })
    ).rejects.toThrow('You are not a participant in this DM channel');
  });

  test('should send a message in direct messages', async () => {
    const { caller: caller1 } = await initTest(3);
    const { caller: caller2 } = await initTest(4);

    const messagesBefore = await caller2.messages.get({
      channelId: 3, // DM channel between user 3 and 4
      cursor: null,
      limit: 50
    });

    await caller1.messages.send({
      channelId: 3, // DM channel between user 3 and 4
      content: 'Hello in DM',
      files: []
    });

    const messagesAfter = await caller2.messages.get({
      channelId: 3, // DM channel between user 3 and 4
      cursor: null,
      limit: 50
    });

    expect(messagesBefore.messages.length).toBe(1); // first dm is already mocked
    expect(messagesAfter.messages.length).toBe(2);
    expect(messagesAfter.messages[0]!.content).toBe('Hello in DM');
  });
});
