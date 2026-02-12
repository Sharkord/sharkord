import { sha256, type TTempFile } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { initTest, uploadFile } from '../../__tests__/helpers';
import { tdb } from '../../__tests__/setup';
import { users } from '../../db/schema';

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

    const hashedPassword = await sha256(newPassword);

    // should be hashed
    expect(row!.password).toBe(hashedPassword);
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
