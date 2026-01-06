import { ChannelPermission, ChannelType } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { initTest } from '../../__tests__/helpers';
import { getChannelsReadStatesForUser } from '../../db/queries/channels';

describe('channels router', () => {
  test('should throw when user lacks permissions (add)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.channels.add({
        type: ChannelType.TEXT,
        name: 'new-channel',
        categoryId: 1
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should throw when user lacks permissions (get)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.channels.get({
        channelId: 1
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should throw when user lacks permissions (update)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.channels.update({
        channelId: 1,
        name: 'updated-channel',
        topic: 'Updated topic',
        private: false
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should throw when user lacks permissions (delete)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.channels.delete({
        channelId: 1
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should throw when user lacks permissions (reorder)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.channels.reorder({
        categoryId: 1,
        channelIds: [2, 1]
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should throw when user lacks permissions (updatePermissions)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.channels.updatePermissions({
        channelId: 1,
        roleId: 1,
        permissions: [ChannelPermission.VIEW_CHANNEL]
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should throw when user lacks permissions (getPermissions)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.channels.getPermissions({
        channelId: 1
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should throw when user lacks permissions (deletePermissions)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.channels.deletePermissions({
        channelId: 1,
        roleId: 1
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should create a new text channel', async () => {
    const { caller } = await initTest();

    await caller.channels.add({
      type: ChannelType.TEXT,
      name: 'test-channel',
      categoryId: 1
    });

    const channel = await caller.channels.get({
      channelId: 3
    });

    expect(channel).toBeDefined();
    expect(channel.name).toBe('test-channel');
    expect(channel.type).toBe(ChannelType.TEXT);
    expect(channel.categoryId).toBe(1);
  });

  test('should create a new voice channel', async () => {
    const { caller } = await initTest();

    await caller.channels.add({
      type: ChannelType.VOICE,
      name: 'voice-lounge',
      categoryId: 1
    });

    const channel = await caller.channels.get({
      channelId: 3
    });

    expect(channel).toBeDefined();
    expect(channel.name).toBe('voice-lounge');
    expect(channel.type).toBe(ChannelType.VOICE);
  });

  test('should get existing channel', async () => {
    const { caller } = await initTest();

    const channel = await caller.channels.get({
      channelId: 1
    });

    expect(channel).toBeDefined();
    expect(channel.id).toBe(1);
    expect(channel.name).toBeDefined();
  });

  test('should update channel name, topic, and private status', async () => {
    const { caller } = await initTest();

    await caller.channels.update({
      channelId: 1,
      name: 'updated-channel',
      topic: 'This is a test topic',
      private: true
    });

    const channel = await caller.channels.get({
      channelId: 1
    });

    expect(channel.name).toBe('updated-channel');
    expect(channel.topic).toBe('This is a test topic');
    expect(channel.private).toBe(true);
  });

  test('should update channel topic to null', async () => {
    const { caller } = await initTest();

    await caller.channels.update({
      channelId: 1,
      name: 'test-channel',
      topic: null,
      private: false
    });

    const channel = await caller.channels.get({
      channelId: 1
    });

    expect(channel.topic).toBeNull();
  });

  test('should delete existing channel', async () => {
    const { caller } = await initTest();

    await caller.channels.add({
      type: ChannelType.TEXT,
      name: 'temp-channel',
      categoryId: 1
    });

    await caller.channels.delete({
      channelId: 3
    });

    await expect(
      caller.channels.get({
        channelId: 3
      })
    ).rejects.toThrow('Channel not found');
  });

  test('should throw when deleting non-existing channel', async () => {
    const { caller } = await initTest();

    await expect(
      caller.channels.delete({
        channelId: 999
      })
    ).rejects.toThrow('Channel not found');
  });

  test('should throw when getting non-existing channel', async () => {
    const { caller } = await initTest();

    await expect(
      caller.channels.get({
        channelId: 999
      })
    ).rejects.toThrow('Channel not found');
  });

  test('should reorder channels in a category', async () => {
    const { caller } = await initTest();

    await caller.channels.add({
      type: ChannelType.TEXT,
      name: 'channel-a',
      categoryId: 1
    });

    await caller.channels.add({
      type: ChannelType.TEXT,
      name: 'channel-b',
      categoryId: 1
    });

    await caller.channels.reorder({
      categoryId: 1,
      channelIds: [4, 3, 1, 2]
    });

    const [channel1, channel2, channel3, channel4] = await Promise.all([
      caller.channels.get({ channelId: 1 }),
      caller.channels.get({ channelId: 2 }),
      caller.channels.get({ channelId: 3 }),
      caller.channels.get({ channelId: 4 })
    ]);

    expect(channel4.position).toBe(1);
    expect(channel3.position).toBe(2);
    expect(channel1.position).toBe(3);
    expect(channel2.position).toBe(4);
  });

  test('should set channel permissions for a role', async () => {
    const { caller } = await initTest();

    await caller.channels.updatePermissions({
      channelId: 1,
      roleId: 1,
      permissions: [
        ChannelPermission.VIEW_CHANNEL,
        ChannelPermission.SEND_MESSAGES
      ]
    });

    const permissions = await caller.channels.getPermissions({
      channelId: 1
    });

    expect(permissions).toBeDefined();
    expect(permissions.rolePermissions).toBeDefined();
    expect(permissions.rolePermissions.length).toBeGreaterThan(0);

    const rolePerms = permissions.rolePermissions.filter((p) => p.roleId === 1);

    expect(rolePerms.length).toBeGreaterThan(0);

    const viewChannelPerm = rolePerms.find(
      (p) => p.permission === ChannelPermission.VIEW_CHANNEL
    );
    const sendMessagesPerm = rolePerms.find(
      (p) => p.permission === ChannelPermission.SEND_MESSAGES
    );

    expect(viewChannelPerm?.allow).toBe(true);
    expect(sendMessagesPerm?.allow).toBe(true);
  });

  test('should set channel permissions for a user', async () => {
    const { caller } = await initTest();

    await caller.channels.updatePermissions({
      channelId: 1,
      userId: 1,
      permissions: [ChannelPermission.VIEW_CHANNEL]
    });

    const permissions = await caller.channels.getPermissions({
      channelId: 1
    });

    expect(permissions.userPermissions).toBeDefined();
    expect(permissions.userPermissions.length).toBeGreaterThan(0);

    const userPerms = permissions.userPermissions.filter((p) => p.userId === 1);

    expect(userPerms.length).toBeGreaterThan(0);

    const viewChannelPerm = userPerms.find(
      (p) => p.permission === ChannelPermission.VIEW_CHANNEL
    );

    expect(viewChannelPerm?.allow).toBe(true);
  });

  test('should create empty permission set with isCreate flag', async () => {
    const { caller } = await initTest();

    await caller.channels.updatePermissions({
      channelId: 1,
      roleId: 2,
      isCreate: true,
      permissions: [ChannelPermission.VIEW_CHANNEL] // should be ignored
    });

    const permissions = await caller.channels.getPermissions({
      channelId: 1
    });

    const rolePerms = permissions.rolePermissions.filter((p) => p.roleId === 2);
    const allowedPerms = rolePerms.filter((p) => p.allow);

    expect(allowedPerms.length).toBe(0);
  });

  test('should delete channel permissions for a role', async () => {
    const { caller } = await initTest();

    await caller.channels.updatePermissions({
      channelId: 1,
      roleId: 1,
      permissions: [ChannelPermission.VIEW_CHANNEL]
    });

    let permissions = await caller.channels.getPermissions({
      channelId: 1
    });

    const rolePermsBeforeDelete = permissions.rolePermissions.filter(
      (p) => p.roleId === 1
    );

    expect(rolePermsBeforeDelete.length).toBeGreaterThan(0);

    await caller.channels.deletePermissions({
      channelId: 1,
      roleId: 1
    });

    permissions = await caller.channels.getPermissions({
      channelId: 1
    });

    const rolePermsAfterDelete = permissions.rolePermissions.filter(
      (p) => p.roleId === 1
    );

    expect(rolePermsAfterDelete.length).toBe(0);
  });

  test('should delete channel permissions for a user', async () => {
    const { caller } = await initTest();

    await caller.channels.updatePermissions({
      channelId: 1,
      userId: 1,
      permissions: [ChannelPermission.VIEW_CHANNEL]
    });

    let permissions = await caller.channels.getPermissions({
      channelId: 1
    });

    const userPermsBeforeDelete = permissions.userPermissions.filter(
      (p) => p.userId === 1
    );

    expect(userPermsBeforeDelete.length).toBeGreaterThan(0);

    await caller.channels.deletePermissions({
      channelId: 1,
      userId: 1
    });

    permissions = await caller.channels.getPermissions({
      channelId: 1
    });

    const userPermsAfterDelete = permissions.userPermissions.filter(
      (p) => p.userId === 1
    );

    expect(userPermsAfterDelete.length).toBe(0);
  });

  test('should mark channel as read', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller2 } = await initTest(2);

    const beforeMsgSendReadStates = await getChannelsReadStatesForUser(2, 2);

    // before sending any messages, there should be no read state
    expect(beforeMsgSendReadStates[2]).toBeUndefined();

    await caller1.messages.send({
      channelId: 2,
      content: 'Test message for read state',
      files: []
    });

    const beforeReadStates = await getChannelsReadStatesForUser(2, 2);

    // message has been sent, there should be 1 unread message
    expect(beforeReadStates[2]).toBeDefined();
    expect(beforeReadStates[2]).toBe(1);

    await caller2.channels.markAsRead({
      channelId: 2
    });

    const afterReadStates = await getChannelsReadStatesForUser(2, 2);

    // after marking as read, there should be 0 unread messages
    expect(afterReadStates[2]).toBeDefined();
    expect(afterReadStates[2]).toBe(0);
  });

  test('should mark channel as read with no messages', async () => {
    const { caller } = await initTest();

    // channel 2 has no messages, so marking as read should do nothing
    await caller.channels.markAsRead({
      channelId: 2
    });

    const readStates = await getChannelsReadStatesForUser(1, 2);

    // should not create a read state for empty channel
    expect(readStates[2]).toBeUndefined();
  });

  test('should update existing read state when marking as read again', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller2 } = await initTest(2);

    // user 1 sends first message
    await caller1.messages.send({
      channelId: 2,
      content: 'First message',
      files: []
    });

    // user 2 marks as read
    await caller2.channels.markAsRead({
      channelId: 2
    });

    const firstReadStates = await getChannelsReadStatesForUser(2, 2);

    expect(firstReadStates[2]).toBe(0);

    // user 1 sends another message
    await caller1.messages.send({
      channelId: 2,
      content: 'Second message',
      files: []
    });

    const beforeSecondMark = await getChannelsReadStatesForUser(2, 2);

    expect(beforeSecondMark[2]).toBe(1);

    // user 2 marks as read again
    await caller2.channels.markAsRead({
      channelId: 2
    });

    const afterSecondMark = await getChannelsReadStatesForUser(2, 2);

    expect(afterSecondMark[2]).toBe(0);
  });

  test('should track unread count correctly with multiple messages', async () => {
    const { caller: caller1 } = await initTest(1);
    const { caller: caller2 } = await initTest(2);

    // user 1 sends 3 messages
    await caller1.messages.send({
      channelId: 2,
      content: 'Message 1',
      files: []
    });

    await caller1.messages.send({
      channelId: 2,
      content: 'Message 2',
      files: []
    });

    await caller1.messages.send({
      channelId: 2,
      content: 'Message 3',
      files: []
    });

    const readStates = await getChannelsReadStatesForUser(2, 2);

    // user 2 should have 3 unread messages
    expect(readStates[2]).toBe(3);

    // user 2 marks as read
    await caller2.channels.markAsRead({
      channelId: 2
    });

    const afterMark = await getChannelsReadStatesForUser(2, 2);

    expect(afterMark[2]).toBe(0);
  });

  test('should not count own messages as unread', async () => {
    const { caller } = await initTest();

    // user sends messages to channel
    await caller.messages.send({
      channelId: 2,
      content: 'My message 1',
      files: []
    });

    await caller.messages.send({
      channelId: 2,
      content: 'My message 2',
      files: []
    });

    const readStates = await getChannelsReadStatesForUser(1, 2);

    // should have 0 unread messages since user sent them themselves
    expect(readStates[2]).toBe(0);
  });

  test('should validate channel name length (too short)', async () => {
    const { caller } = await initTest();

    await expect(
      caller.channels.add({
        type: ChannelType.TEXT,
        name: '',
        categoryId: 1
      })
    ).rejects.toThrow();
  });

  test('should validate channel name length (too long)', async () => {
    const { caller } = await initTest();

    await expect(
      caller.channels.add({
        type: ChannelType.TEXT,
        name: 'this-is-a-very-long-channel-name-that-exceeds-the-limit',
        categoryId: 1
      })
    ).rejects.toThrow();
  });

  test('should validate topic length (too long)', async () => {
    const { caller } = await initTest();

    await expect(
      caller.channels.update({
        channelId: 1,
        name: 'test-channel',
        topic: 'a'.repeat(200),
        private: false
      })
    ).rejects.toThrow();
  });

  test('should create channel with incrementing position', async () => {
    const { caller } = await initTest();

    await caller.channels.add({
      type: ChannelType.TEXT,
      name: 'first-channel',
      categoryId: 1
    });

    const firstChannel = await caller.channels.get({ channelId: 3 });

    await caller.channels.add({
      type: ChannelType.TEXT,
      name: 'second-channel',
      categoryId: 1
    });

    const secondChannel = await caller.channels.get({ channelId: 4 });

    expect(secondChannel.position).toBeGreaterThan(firstChannel.position);
  });

  test('should allow multiple permission types on same channel', async () => {
    const { caller } = await initTest();

    await caller.channels.updatePermissions({
      channelId: 1,
      roleId: 1,
      permissions: [ChannelPermission.VIEW_CHANNEL]
    });

    await caller.channels.updatePermissions({
      channelId: 1,
      userId: 1,
      permissions: [ChannelPermission.SEND_MESSAGES]
    });

    const permissions = await caller.channels.getPermissions({
      channelId: 1
    });

    expect(permissions.rolePermissions.length).toBeGreaterThan(0);
    expect(permissions.userPermissions.length).toBeGreaterThan(0);
  });

  test('should update existing permissions when called again', async () => {
    const { caller } = await initTest();

    await caller.channels.updatePermissions({
      channelId: 1,
      roleId: 1,
      permissions: [ChannelPermission.VIEW_CHANNEL]
    });

    await caller.channels.updatePermissions({
      channelId: 1,
      roleId: 1,
      permissions: [
        ChannelPermission.VIEW_CHANNEL,
        ChannelPermission.SEND_MESSAGES
      ]
    });

    const permissions = await caller.channels.getPermissions({
      channelId: 1
    });

    const rolePerms = permissions.rolePermissions.filter((p) => p.roleId === 1);

    const sendMessagesPerm = rolePerms.find(
      (p) => p.permission === ChannelPermission.SEND_MESSAGES
    );

    expect(sendMessagesPerm?.allow).toBe(true);
  });

  test('should create channels in different categories', async () => {
    const { caller } = await initTest();

    await caller.channels.add({
      type: ChannelType.TEXT,
      name: 'cat-1-channel',
      categoryId: 1
    });

    await caller.channels.add({
      type: ChannelType.TEXT,
      name: 'cat-2-channel',
      categoryId: 2
    });

    const channel1 = await caller.channels.get({ channelId: 3 });
    const channel2 = await caller.channels.get({ channelId: 4 });

    expect(channel1.categoryId).toBe(1);
    expect(channel2.categoryId).toBe(2);
  });
});
