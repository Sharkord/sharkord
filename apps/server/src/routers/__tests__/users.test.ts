import {
  DELETED_USER_IDENTITY_AND_NAME,
  Permission,
  type TTempFile
} from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { initTest, uploadFile } from '../../__tests__/helpers';
import { tdb } from '../../__tests__/setup';
import {
  channels,
  emojis,
  files,
  logins,
  messageReactions,
  messages,
  rolePermissions,
  roles,
  userRoles,
  users
} from '../../db/schema';

describe('users router', () => {
  test('should throw when user lacks permissions (getAll)', async () => {
    const { caller } = await initTest(2);

    await expect(caller.users.getAll()).rejects.toThrow(
      'Insufficient permissions'
    );
  });

  test('should throw when user lacks permissions (getInfo)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.users.getInfo({
        userId: 1
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should throw when user lacks permissions (ban)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.users.ban({
        userId: 1,
        reason: 'Test ban'
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should throw when user lacks permissions (unban)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.users.unban({
        userId: 1
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should throw when user lacks permissions (kick)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.users.kick({
        userId: 1,
        reason: 'Test kick'
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should throw when user lacks permissions (addRole)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.users.addRole({
        userId: 1,
        roleId: 2
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should throw when user lacks permissions (removeRole)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.users.removeRole({
        userId: 1,
        roleId: 2
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should throw when user lacks permissions (delete)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.users.delete({
        userId: 1
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should get all users', async () => {
    const { caller } = await initTest();

    const users = await caller.users.getAll();

    expect(users).toBeDefined();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);

    // verify sensitive fields are cleared
    users.forEach((user) => {
      expect(user.password).toBeEmpty();
      expect(user.identity).toBeEmpty();
    });
  });

  test('should get user info', async () => {
    const { caller } = await initTest();

    const info = await caller.users.getInfo({
      userId: 2
    });

    expect(info).toBeDefined();
    expect(info.user).toBeDefined();
    expect(info.user.id).toBe(2);
  });

  test('should hide sensitive data when user has MANAGE_USERS but not VIEW_USER_SENSITIVE_DATA', async () => {
    // create a custom role with MANAGE_USERS but without VIEW_USER_SENSITIVE_DATA
    const [customRole] = await tdb
      .insert(roles)
      .values({
        name: 'Moderator',
        color: '#00ff00',
        isPersistent: false,
        isDefault: false,
        createdAt: Date.now()
      })
      .returning();

    await tdb.insert(rolePermissions).values({
      roleId: customRole!.id,
      permission: Permission.MANAGE_USERS,
      createdAt: Date.now()
    });

    // assign custom role to user 2
    await tdb.insert(userRoles).values({
      userId: 2,
      roleId: customRole!.id,
      createdAt: Date.now()
    });

    // insert a login record for user 1 so we can verify ip and location are hidden
    await tdb.insert(logins).values({
      userId: 1,
      ip: '192.168.1.1',
      city: 'Gondomar',
      region: 'Porto',
      country: 'PT',
      loc: '41.1833,-8.6333',
      org: 'MEO',
      postal: '10001',
      timezone: 'Europe/Lisbon',
      createdAt: Date.now()
    });

    const { caller } = await initTest(2);

    const info = await caller.users.getInfo({
      userId: 1
    });

    expect(info).toBeDefined();
    expect(info.user).toBeDefined();
    expect(info.user.id).toBe(1);

    expect(info.user.identity).toBeEmpty();
    expect(info.logins.length).toBeGreaterThan(0);

    info.logins.forEach((login) => {
      expect(login.ip).toBeNull();
      expect(login.loc).toBeNull();
    });
  });

  test('should throw when getting info for non-existing user', async () => {
    const { caller } = await initTest();

    await expect(
      caller.users.getInfo({
        userId: 999
      })
    ).rejects.toThrow('User not found');
  });

  test('should update own user profile', async () => {
    const { caller } = await initTest();

    await caller.users.update({
      name: 'Updated Name',
      bannerColor: '#ff0000',
      bio: 'This is my new bio'
    });

    const users = await caller.users.getAll();
    const updatedUser = users.find((u) => u.id === 1);

    expect(updatedUser).toBeDefined();
    expect(updatedUser!.name).toBe('Updated Name');
    expect(updatedUser!.bannerColor).toBe('#ff0000');
    expect(updatedUser!.bio).toBe('This is my new bio');
  });

  test('should update user profile with null bio', async () => {
    const { caller } = await initTest();

    await caller.users.update({
      name: 'Test User',
      bannerColor: '#00ff00'
    });

    const users = await caller.users.getAll();
    const updatedUser = users.find((u) => u.id === 1);

    expect(updatedUser).toBeDefined();
    expect(updatedUser!.name).toBe('Test User');
    expect(updatedUser!.bannerColor).toBe('#00ff00');
  });

  test('should update password successfully', async () => {
    const { caller } = await initTest();

    const currentPassword = 'password123';
    const newPassword = 'newpassword456';

    await caller.users.updatePassword({
      currentPassword,
      newPassword,
      confirmNewPassword: newPassword
    });

    const row = await tdb
      .select({
        password: users.password
      })
      .from(users)
      .where(eq(users.id, 1))
      .get();

    expect(row).toBeDefined();

    // should not be plain text
    expect(row!.password).not.toBe(newPassword);

    // should be hashed with argon2
    expect(row!.password).toStartWith('$argon2');

    // should verify against the new password
    const isValid = await Bun.password.verify(newPassword, row!.password);
    expect(isValid).toBe(true);
  });

  test('should throw when current password is incorrect', async () => {
    const { caller } = await initTest();

    await expect(
      caller.users.updatePassword({
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword',
        confirmNewPassword: 'newpassword'
      })
    ).rejects.toThrow('Current password is incorrect');
  });

  test('should throw when new passwords do not match', async () => {
    const { caller } = await initTest();

    await expect(
      caller.users.updatePassword({
        currentPassword: 'password123',
        newPassword: 'newpassword',
        confirmNewPassword: 'differentpassword'
      })
    ).rejects.toThrow('New password and confirmation do not match');
  });

  test('should change avatar', async () => {
    const { caller, mockedToken } = await initTest();

    const currentUserInfo = await caller.users.getInfo({ userId: 1 });

    expect(currentUserInfo).toBeDefined();
    expect(currentUserInfo.user.avatarId).toBeNull();

    const file = new File(['avatar content'], 'avatar.png', {
      type: 'image/png'
    });

    const uploadResponse = await uploadFile(file, mockedToken);
    const uploadData = (await uploadResponse.json()) as TTempFile;

    await caller.users.changeAvatar({
      fileId: uploadData.id
    });

    const userInfo = await caller.users.getInfo({ userId: 1 });

    expect(userInfo).toBeDefined();
    expect(userInfo!.user.avatarId).toBeDefined();
  });

  test('should remove avatar', async () => {
    const { caller, mockedToken } = await initTest();

    const currentUserInfo = await caller.users.getInfo({ userId: 1 });

    expect(currentUserInfo).toBeDefined();
    expect(currentUserInfo.user.avatarId).toBeNull();

    const file = new File(['avatar content'], 'avatar.png', {
      type: 'image/png'
    });

    const uploadResponse = await uploadFile(file, mockedToken);
    const uploadData = (await uploadResponse.json()) as TTempFile;

    await caller.users.changeAvatar({
      fileId: uploadData.id
    });

    await caller.users.changeAvatar({});

    const userInfo = await caller.users.getInfo({ userId: 1 });

    expect(userInfo).toBeDefined();
    expect(userInfo!.user.avatarId).toBeNull();
  });

  test('should change banner', async () => {
    const { caller, mockedToken } = await initTest();

    const file = new File(['banner content'], 'banner.png', {
      type: 'image/png'
    });

    const uploadResponse = await uploadFile(file, mockedToken);
    const uploadData = (await uploadResponse.json()) as TTempFile;

    await caller.users.changeBanner({
      fileId: uploadData.id
    });

    const userInfo = await caller.users.getInfo({ userId: 1 });

    expect(userInfo).toBeDefined();
    expect(userInfo!.user.bannerId).toBeDefined();
  });

  test('should remove banner', async () => {
    const { caller, mockedToken } = await initTest();

    const file = new File(['banner content'], 'banner.png', {
      type: 'image/png'
    });

    const uploadResponse = await uploadFile(file, mockedToken);
    const uploadData = (await uploadResponse.json()) as TTempFile;

    await caller.users.changeBanner({
      fileId: uploadData.id
    });

    await caller.users.changeBanner({});

    const userInfo = await caller.users.getInfo({ userId: 1 });

    expect(userInfo).toBeDefined();
    expect(userInfo!.user.bannerId).toBeNull();
  });

  test('should replace existing avatar', async () => {
    const { caller, mockedToken } = await initTest();

    const file1 = new File(['first avatar'], 'avatar1.png', {
      type: 'image/png'
    });

    const uploadResponse1 = await uploadFile(file1, mockedToken);
    const uploadData1 = (await uploadResponse1.json()) as TTempFile;

    await caller.users.changeAvatar({
      fileId: uploadData1.id
    });

    const firstInfo = await caller.users.getInfo({ userId: 1 });
    const firstAvatarId = firstInfo.user.avatarId;

    const file2 = new File(['second avatar'], 'avatar2.png', {
      type: 'image/png'
    });

    const uploadResponse2 = await uploadFile(file2, mockedToken);
    const uploadData2 = (await uploadResponse2.json()) as TTempFile;

    await caller.users.changeAvatar({
      fileId: uploadData2.id
    });

    const secondInfo = await caller.users.getInfo({ userId: 1 });

    expect(secondInfo.user.avatarId).not.toBe(firstAvatarId);
  });

  test('should add role to user', async () => {
    const { caller } = await initTest();

    await caller.users.addRole({
      userId: 2,
      roleId: 1
    });

    const info = await caller.users.getInfo({
      userId: 2
    });

    expect(info.user.roleIds).toContain(1);
  });

  test('should throw when adding duplicate role', async () => {
    const { caller } = await initTest();

    await expect(
      caller.users.addRole({
        userId: 2,
        roleId: 2
      })
    ).rejects.toThrow('User already has this role');
  });

  test('should remove role from user', async () => {
    const { caller } = await initTest();

    await caller.users.addRole({
      userId: 2,
      roleId: 1
    });

    await caller.users.removeRole({
      userId: 2,
      roleId: 1
    });

    const info = await caller.users.getInfo({
      userId: 2
    });

    expect(info.user.roleIds).not.toContain(1);
  });

  test('should throw when removing non-existent role', async () => {
    const { caller } = await initTest();

    await expect(
      caller.users.removeRole({
        userId: 2,
        roleId: 3
      })
    ).rejects.toThrow('User does not have this role');
  });

  test('should ban user with reason', async () => {
    const { caller } = await initTest();

    await caller.users.ban({
      userId: 2,
      reason: 'Violated community guidelines'
    });

    const info = await caller.users.getInfo({
      userId: 2
    });

    expect(info.user.banned).toBe(true);
    expect(info.user.banReason).toBe('Violated community guidelines');
    expect(info.user.bannedAt).toBeDefined();
  });

  test('should ban user without reason', async () => {
    const { caller } = await initTest();

    await caller.users.ban({
      userId: 2
    });

    const info = await caller.users.getInfo({
      userId: 2
    });

    expect(info.user.banned).toBe(true);
    expect(info.user.banReason).toBeNull();
  });

  test('should throw when trying to ban yourself', async () => {
    const { caller } = await initTest();

    await expect(
      caller.users.ban({
        userId: 1
      })
    ).rejects.toThrow('You cannot ban yourself');
  });

  test('should delete a user', async () => {
    const { caller } = await initTest();

    await caller.users.delete({
      userId: 2
    });

    const deletedUser = await tdb
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, 2))
      .get();

    expect(deletedUser).toBeUndefined();
  });

  test('should throw when trying to delete yourself', async () => {
    const { caller } = await initTest();

    await expect(
      caller.users.delete({
        userId: 1
      })
    ).rejects.toThrow('You cannot delete yourself.');
  });

  test('should throw when trying to delete a non-existing user', async () => {
    const { caller } = await initTest();

    await expect(
      caller.users.delete({
        userId: 999
      })
    ).rejects.toThrow('User not found.');
  });

  test('should reassign user data to Deleted user when deleting without wipe', async () => {
    const { caller } = await initTest();

    const targetUserId = 2;
    const now = Date.now();

    const targetChannel = await tdb
      .select({ id: channels.id })
      .from(channels)
      .get();

    expect(targetChannel).toBeDefined();

    await tdb.insert(messages).values({
      content: `keep-message-${now}`,
      userId: targetUserId,
      channelId: targetChannel!.id,
      editable: true,
      createdAt: now,
      updatedAt: now
    });

    const messageBeforeDelete = await tdb
      .select()
      .from(messages)
      .where(eq(messages.content, `keep-message-${now}`))
      .get();

    expect(messageBeforeDelete).toBeDefined();
    expect(messageBeforeDelete!.userId).toBe(targetUserId);

    const emojiFileName = `emoji-file-${now}.png`;
    const emojiName = `emoji_${now}`;

    const insertedEmojiFile = await tdb
      .insert(files)
      .values({
        name: emojiFileName,
        originalName: emojiFileName,
        md5: `md5-${now}`,
        userId: targetUserId,
        size: 123,
        mimeType: 'image/png',
        extension: 'png',
        createdAt: now,
        updatedAt: now
      })
      .returning({ id: files.id })
      .get();

    expect(insertedEmojiFile).toBeDefined();

    await tdb.insert(emojis).values({
      name: emojiName,
      fileId: insertedEmojiFile!.id,
      userId: targetUserId,
      createdAt: now,
      updatedAt: now
    });

    await tdb.insert(messageReactions).values({
      messageId: messageBeforeDelete!.id,
      userId: targetUserId,
      emoji: '👍',
      fileId: null,
      createdAt: now
    });

    await caller.users.delete({
      userId: targetUserId,
      wipe: false
    });

    const deletedUser = await tdb
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, targetUserId))
      .get();

    expect(deletedUser).toBeUndefined();

    const deletedPlaceholderUser = await tdb
      .select({ id: users.id })
      .from(users)
      .where(eq(users.identity, DELETED_USER_IDENTITY_AND_NAME))
      .get();

    expect(deletedPlaceholderUser).toBeDefined();

    const messageAfterDelete = await tdb
      .select()
      .from(messages)
      .where(eq(messages.content, `keep-message-${now}`))
      .get();

    expect(messageAfterDelete).toBeDefined();
    expect(messageAfterDelete!.userId).toBe(deletedPlaceholderUser!.id);

    const emojiAfterDelete = await tdb
      .select({ userId: emojis.userId })
      .from(emojis)
      .where(eq(emojis.name, emojiName))
      .get();

    expect(emojiAfterDelete).toBeDefined();
    expect(emojiAfterDelete!.userId).toBe(deletedPlaceholderUser!.id);

    const emojiFileAfterDelete = await tdb
      .select({ userId: files.userId })
      .from(files)
      .where(eq(files.id, insertedEmojiFile!.id))
      .get();

    expect(emojiFileAfterDelete).toBeDefined();
    expect(emojiFileAfterDelete!.userId).toBe(deletedPlaceholderUser!.id);

    const reactionAfterDelete = await tdb
      .select({ userId: messageReactions.userId })
      .from(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, messageBeforeDelete!.id),
          eq(messageReactions.emoji, '👍')
        )
      )
      .get();

    expect(reactionAfterDelete).toBeDefined();
    expect(reactionAfterDelete!.userId).toBe(deletedPlaceholderUser!.id);
  });

  test('should wipe all linked data when deleting user with wipe', async () => {
    const { caller } = await initTest();

    const targetUserId = 2;
    const now = Date.now();

    const targetChannel = await tdb
      .select({ id: channels.id })
      .from(channels)
      .get();

    expect(targetChannel).toBeDefined();

    const insertedMessageFile = await tdb
      .insert(files)
      .values({
        name: `wipe-message-file-${now}.png`,
        originalName: `wipe-message-file-${now}.png`,
        md5: `wipe-md5-message-${now}`,
        userId: targetUserId,
        size: 100,
        mimeType: 'image/png',
        extension: 'png',
        createdAt: now,
        updatedAt: now
      })
      .returning({ id: files.id })
      .get();

    const insertedEmojiFile = await tdb
      .insert(files)
      .values({
        name: `wipe-emoji-file-${now}.png`,
        originalName: `wipe-emoji-file-${now}.png`,
        md5: `wipe-md5-emoji-${now}`,
        userId: targetUserId,
        size: 120,
        mimeType: 'image/png',
        extension: 'png',
        createdAt: now,
        updatedAt: now
      })
      .returning({ id: files.id })
      .get();

    expect(insertedMessageFile).toBeDefined();
    expect(insertedEmojiFile).toBeDefined();

    await tdb.insert(emojis).values({
      name: `wipe_emoji_${now}`,
      fileId: insertedEmojiFile!.id,
      userId: targetUserId,
      createdAt: now,
      updatedAt: now
    });

    await tdb.insert(messages).values({
      content: `wipe-message-${now}`,
      userId: targetUserId,
      channelId: targetChannel!.id,
      editable: true,
      createdAt: now,
      updatedAt: now
    });

    const targetMessage = await tdb
      .select({ id: messages.id })
      .from(messages)
      .where(eq(messages.content, `wipe-message-${now}`))
      .get();

    expect(targetMessage).toBeDefined();

    await tdb.insert(messageReactions).values({
      messageId: targetMessage!.id,
      userId: targetUserId,
      emoji: '🧪',
      fileId: null,
      createdAt: now
    });

    const existingMessageByOtherUser = await tdb
      .select({ id: messages.id })
      .from(messages)
      .where(eq(messages.userId, 1))
      .get();

    expect(existingMessageByOtherUser).toBeDefined();

    await tdb.insert(messageReactions).values({
      messageId: existingMessageByOtherUser!.id,
      userId: targetUserId,
      emoji: `wipe-reaction-${now}`,
      fileId: null,
      createdAt: now
    });

    await caller.users.delete({
      userId: targetUserId,
      wipe: true
    });

    const deletedUser = await tdb
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, targetUserId))
      .get();

    expect(deletedUser).toBeUndefined();

    const wipedMessage = await tdb
      .select({ id: messages.id })
      .from(messages)
      .where(eq(messages.id, targetMessage!.id))
      .get();

    expect(wipedMessage).toBeUndefined();

    const wipedEmoji = await tdb
      .select({ id: emojis.id })
      .from(emojis)
      .where(eq(emojis.name, `wipe_emoji_${now}`))
      .get();

    expect(wipedEmoji).toBeUndefined();

    const wipedReactionFromOtherMessage = await tdb
      .select({ userId: messageReactions.userId })
      .from(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, existingMessageByOtherUser!.id),
          eq(messageReactions.emoji, `wipe-reaction-${now}`)
        )
      )
      .get();

    expect(wipedReactionFromOtherMessage).toBeUndefined();

    const wipedMessageFile = await tdb
      .select({ id: files.id, userId: files.userId })
      .from(files)
      .where(eq(files.id, insertedMessageFile!.id))
      .get();

    expect(wipedMessageFile).toBeDefined();
    expect(wipedMessageFile!.userId).toBe(targetUserId);

    const wipedEmojiFile = await tdb
      .select({ id: files.id, userId: files.userId })
      .from(files)
      .where(eq(files.id, insertedEmojiFile!.id))
      .get();

    expect(wipedEmojiFile).toBeDefined();
    expect(wipedEmojiFile!.userId).toBe(targetUserId);
  });

  test('should unban user', async () => {
    const { caller } = await initTest();

    await caller.users.ban({
      userId: 2,
      reason: 'Test'
    });

    await caller.users.unban({
      userId: 2
    });

    const info = await caller.users.getInfo({
      userId: 2
    });

    expect(info.user.banned).toBe(false);
    expect(info.user.banReason).toBeNull();
  });

  test('should throw when kicking non-connected user', async () => {
    const { caller } = await initTest();

    await expect(
      caller.users.kick({
        userId: 999
      })
    ).rejects.toThrow('User is not connected');
  });

  test('should handle multiple role operations', async () => {
    const { caller } = await initTest();

    await caller.users.addRole({
      userId: 2,
      roleId: 1
    });

    await caller.users.addRole({
      userId: 2,
      roleId: 3
    });

    const info = await caller.users.getInfo({
      userId: 2
    });

    expect(info.user.roleIds).toContain(1);
    expect(info.user.roleIds).toContain(3);

    await caller.users.removeRole({
      userId: 2,
      roleId: 1
    });

    const updatedInfo = await caller.users.getInfo({
      userId: 2
    });

    expect(updatedInfo.user.roleIds).not.toContain(1);
    expect(updatedInfo.user.roleIds).toContain(3);
  });

  test('should allow valid hex colors (3 and 6 digits)', async () => {
    const { caller } = await initTest();

    await caller.users.update({
      name: 'Test',
      bannerColor: '#abc123'
    });

    let info = await caller.users.getInfo({ userId: 1 });

    expect(info.user.bannerColor).toBe('#abc123');

    await caller.users.update({
      name: 'Test',
      bannerColor: '#f0f'
    });

    info = await caller.users.getInfo({ userId: 1 });

    expect(info.user.bannerColor).toBe('#f0f');
  });

  test('should handle bio with special characters', async () => {
    const { caller } = await initTest();

    const specialBio = 'Hello! 👋 This is my bio with émojis & spëcial çhars';

    await caller.users.update({
      name: 'Test User',
      bannerColor: '#000000',
      bio: specialBio
    });

    const info = await caller.users.getInfo({ userId: 1 });

    expect(info.user.bio).toBe(specialBio);
  });

  test('should handle multiple profile updates in sequence', async () => {
    const { caller } = await initTest();

    await caller.users.update({
      name: 'Name 1',
      bannerColor: '#111111',
      bio: 'Bio 1'
    });

    await caller.users.update({
      name: 'Name 2',
      bannerColor: '#222222',
      bio: 'Bio 2'
    });

    await caller.users.update({
      name: 'Final Name',
      bannerColor: '#333333',
      bio: 'Final Bio'
    });

    const info = await caller.users.getInfo({ userId: 1 });

    expect(info.user.name).toBe('Final Name');
    expect(info.user.bannerColor).toBe('#333333');
    expect(info.user.bio).toBe('Final Bio');
  });
});
