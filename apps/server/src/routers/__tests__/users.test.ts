import {
  DELETED_USER_IDENTITY_AND_NAME,
  DisconnectCode,
  OWNER_ROLE_ID,
  Permission,
  ServerEvents,
  type TTempFile
} from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import {
  createFakeSocket,
  getCaller,
  getMockedToken,
  initTest,
  login,
  uploadFile
} from '../../__tests__/helpers';
import { tdb } from '../../__tests__/setup';
import { getUserByToken } from '../../db/queries/users';
import {
  channels,
  emojis,
  files,
  logins,
  messageReactions,
  messages,
  rolePermissions,
  roles,
  settings,
  userRoles,
  users
} from '../../db/schema';
import { pubsub } from '../../utils/pubsub';

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

    // verify sensitive fields are removed rather than blanked
    users.forEach((user) => {
      expect('password' in user).toBe(false);
      expect('identity' in user).toBe(false);
      expect('tokenVersion' in user).toBe(false);
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

  test('should include user storage info', async () => {
    const { caller } = await initTest();
    const now = Date.now();

    await tdb.insert(files).values([
      {
        name: `storage-a-${now}.txt`,
        originalName: 'storage-a.txt',
        md5: 'storage-a',
        userId: 2,
        size: 12,
        mimeType: 'text/plain',
        extension: '.txt',
        createdAt: now
      },
      {
        name: `storage-b-${now}.txt`,
        originalName: 'storage-b.txt',
        md5: 'storage-b',
        userId: 2,
        size: 34,
        mimeType: 'text/plain',
        extension: '.txt',
        createdAt: now
      }
    ]);

    const info = await caller.users.getInfo({ userId: 2 });

    expect(info.storage.userId).toBe(2);
    expect(info.storage.fileCount).toBe(2);
    expect(info.storage.usedStorage).toBe(46);
  });

  test('should include global storage quota when user has no role override', async () => {
    const { caller } = await initTest();

    await tdb.update(settings).set({ storageSpaceQuotaByUser: 123 }).execute();

    const info = await caller.users.getInfo({ userId: 2 });

    expect(info.storage.quota).toBe(123);
  });

  test('should include effective role storage quota override', async () => {
    const { caller } = await initTest();

    await tdb.update(settings).set({ storageSpaceQuotaByUser: 123 }).execute();
    await tdb
      .update(roles)
      .set({
        storageQuotaOverrideEnabled: true,
        storageSpaceQuota: 456
      })
      .where(eq(roles.id, 2))
      .execute();

    const info = await caller.users.getInfo({ userId: 2 });

    expect(info.storage.quota).toBe(456);
  });

  test('should include unlimited role storage quota override', async () => {
    const { caller } = await initTest();

    await tdb.update(settings).set({ storageSpaceQuotaByUser: 123 }).execute();
    await tdb
      .update(roles)
      .set({
        storageQuotaOverrideEnabled: true,
        storageSpaceQuota: 0
      })
      .where(eq(roles.id, 2))
      .execute();

    const info = await caller.users.getInfo({ userId: 2 });

    expect(info.storage.quota).toBe(0);
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

    // identity stays present but null without VIEW_USER_SENSITIVE_DATA
    expect(info.user.identity).toBeNull();
    expect('password' in info.user).toBe(false);
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
      profileColor: '#ff0000',
      bio: 'This is my new bio'
    });

    const users = await caller.users.getAll();
    const updatedUser = users.find((u) => u.id === 1);

    expect(updatedUser).toBeDefined();
    expect(updatedUser!.name).toBe('Updated Name');
    expect(updatedUser!.profileColor).toBe('#ff0000');
    expect(updatedUser!.bio).toBe('This is my new bio');
  });

  test('should update user profile with null bio', async () => {
    const { caller } = await initTest();

    await caller.users.update({
      name: 'Test User',
      profileColor: '#00ff00'
    });

    const users = await caller.users.getAll();
    const updatedUser = users.find((u) => u.id === 1);

    expect(updatedUser).toBeDefined();
    expect(updatedUser!.name).toBe('Test User');
    expect(updatedUser!.profileColor).toBe('#00ff00');
  });

  test('should accept a shorthand hex profile color', async () => {
    const { caller } = await initTest();

    await caller.users.update({
      name: 'Test User',
      profileColor: '#f0f'
    });

    const info = await caller.users.getInfo({ userId: 1 });

    expect(info.user.profileColor).toBe('#f0f');
  });

  test('should reject a profile color that is not a hex value', async () => {
    const { caller } = await initTest();

    await expect(
      caller.users.update({
        name: 'Test User',
        // a pre-migration bannerColor could hold a full css gradient
        profileColor: 'linear-gradient(90deg, red, blue)'
      })
    ).rejects.toThrow('Invalid hex color');
  });

  test('should reject a hex value of the wrong length', async () => {
    const { caller } = await initTest();

    await expect(
      caller.users.update({
        name: 'Test User',
        profileColor: '#12345'
      })
    ).rejects.toThrow('Invalid hex color');
  });

  test('should leave the stored profile color untouched when validation fails', async () => {
    const { caller } = await initTest();

    await caller.users.update({
      name: 'Test User',
      profileColor: '#123456'
    });

    await expect(
      caller.users.update({
        name: 'Test User',
        profileColor: 'nope'
      })
    ).rejects.toThrow('Invalid hex color');

    const info = await caller.users.getInfo({ userId: 1 });

    expect(info.user.profileColor).toBe('#123456');
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

  test('should invalidate tokens issued before a password change', async () => {
    const { caller, mockedToken } = await initTest();

    expect(await getUserByToken(mockedToken)).toBeDefined();

    await caller.users.updatePassword({
      currentPassword: 'password123',
      newPassword: 'newpassword456',
      confirmNewPassword: 'newpassword456'
    });

    const row = await tdb
      .select({ tokenVersion: users.tokenVersion })
      .from(users)
      .where(eq(users.id, 1))
      .get();

    expect(row?.tokenVersion).toBe(1);

    // the old token still verifies cryptographically, it is the tokensValidAfter check
    // that has to refuse it
    expect(jwt.decode(mockedToken)).toBeTruthy();
    expect(await getUserByToken(mockedToken)).toBeUndefined();
  });

  test('should accept a token carrying the new version', async () => {
    const { caller } = await initTest();

    await caller.users.updatePassword({
      currentPassword: 'password123',
      newPassword: 'newpassword456',
      confirmNewPassword: 'newpassword456'
    });

    const freshToken = await getMockedToken(1, 1);

    expect(await getUserByToken(freshToken)).toBeDefined();
  });

  test('should leave other users tokens alone on a password change', async () => {
    const { caller } = await initTest();
    const otherToken = await getMockedToken(2);

    await caller.users.updatePassword({
      currentPassword: 'password123',
      newPassword: 'newpassword456',
      confirmNewPassword: 'newpassword456'
    });

    expect(await getUserByToken(otherToken)).toBeDefined();
  });

  test('should close every other session of its own user on a password change', async () => {
    const ownSocket = createFakeSocket();
    const otherSocket = createFakeSocket();

    const { caller } = await initTest(1, undefined, {
      getOwnWs: () => ownSocket,
      getUserWs: () => [ownSocket, otherSocket]
    });

    await caller.users.updatePassword({
      currentPassword: 'password123',
      newPassword: 'newpassword456',
      confirmNewPassword: 'newpassword456'
    });

    expect(otherSocket.closes).toEqual([
      { code: DisconnectCode.KICKED, reason: 'Your password was changed' }
    ]);

    // the session that changed the password keeps running, it already has the new credentials
    expect(ownSocket.closes).toEqual([]);
  });

  test('should not close any session when the password change is refused', async () => {
    const ownSocket = createFakeSocket();
    const otherSocket = createFakeSocket();

    const { caller } = await initTest(1, undefined, {
      getOwnWs: () => ownSocket,
      getUserWs: () => [ownSocket, otherSocket]
    });

    await expect(
      caller.users.updatePassword({
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword456',
        confirmNewPassword: 'newpassword456'
      })
    ).rejects.toThrow('Current password is incorrect');

    expect(otherSocket.closes).toEqual([]);
    expect(ownSocket.closes).toEqual([]);
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

  test('should enforce configured avatar size limit', async () => {
    const { caller, mockedToken } = await initTest();

    await tdb
      .update(settings)
      .set({
        storageMaxAvatarSize: 10
      })
      .execute();

    const file = new File(
      ['avatar content bigger than ten bytes'],
      'avatar.png',
      {
        type: 'image/png'
      }
    );

    const uploadResponse = await uploadFile(file, mockedToken);
    const uploadData = (await uploadResponse.json()) as TTempFile;

    await expect(
      caller.users.changeAvatar({
        fileId: uploadData.id
      })
    ).rejects.toThrow('Avatar file exceeds the configured maximum size');
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

  test('should enforce configured banner size limit', async () => {
    const { caller, mockedToken } = await initTest();

    await tdb
      .update(settings)
      .set({
        storageMaxBannerSize: 10
      })
      .execute();

    const file = new File(
      ['banner content bigger than ten bytes'],
      'banner.png',
      {
        type: 'image/png'
      }
    );

    const uploadResponse = await uploadFile(file, mockedToken);
    const uploadData = (await uploadResponse.json()) as TTempFile;

    await expect(
      caller.users.changeBanner({
        fileId: uploadData.id
      })
    ).rejects.toThrow('Banner file exceeds the configured maximum size');
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

  test('should keep the previous avatar when the new one is rejected', async () => {
    const { caller, mockedToken } = await initTest();

    const file = new File(['first avatar'], 'avatar1.png', {
      type: 'image/png'
    });

    const uploadResponse = await uploadFile(file, mockedToken);
    const uploadData = (await uploadResponse.json()) as TTempFile;

    await caller.users.changeAvatar({
      fileId: uploadData.id
    });

    const before = await caller.users.getInfo({ userId: 1 });

    expect(before.user.avatarId).toBeDefined();

    await tdb
      .update(settings)
      .set({
        storageMaxAvatarSize: 10
      })
      .execute();

    const rejectedFile = new File(
      ['second avatar, bigger than ten bytes'],
      'avatar2.png',
      {
        type: 'image/png'
      }
    );

    const rejectedUpload = await uploadFile(rejectedFile, mockedToken);
    const rejectedData = (await rejectedUpload.json()) as TTempFile;

    await expect(
      caller.users.changeAvatar({
        fileId: rejectedData.id
      })
    ).rejects.toThrow('Avatar file exceeds the configured maximum size');

    const after = await caller.users.getInfo({ userId: 1 });

    expect(after.user.avatarId).toBe(before.user.avatarId);

    const avatarFile = await tdb
      .select({ id: files.id })
      .from(files)
      .where(eq(files.id, before.user.avatarId!))
      .get();

    expect(avatarFile).toBeDefined();
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

  // a role can carry view permissions on private channels, so granting or removing one moves
  // the set of channels the user's client should be holding
  test('should send and withdraw role granted channels as roles change', async () => {
    const { caller } = await initTest();

    // user 2 is denied channel 5 at the user level, so use the moderator role's holder
    // instead: user 5 holds no granting role until we give them the default one
    await tdb
      .delete(userRoles)
      .where(and(eq(userRoles.userId, 5), eq(userRoles.roleId, 2)));

    await initTest(5, { socket: createFakeSocket() });

    const created: number[] = [];
    const deleted: number[] = [];

    const subscriptions = [
      pubsub.subscribeFor(5, ServerEvents.CHANNEL_CREATE).subscribe({
        next: (channel) => {
          created.push(channel.id);
        }
      }),
      pubsub.subscribeFor(5, ServerEvents.CHANNEL_DELETE).subscribe({
        next: (channelId) => {
          deleted.push(channelId);
        }
      })
    ];

    try {
      await caller.users.addRole({ userId: 5, roleId: 2 });

      expect(created).toContain(5);
      expect(deleted).toEqual([]);

      await caller.users.removeRole({ userId: 5, roleId: 2 });

      expect(deleted).toContain(5);
    } finally {
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    }
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

  test('should throw when non-owner user tries to assign owner role to someone else', async () => {
    const { caller } = await initTest();
    const newRoleId = await caller.roles.add();

    await caller.roles.update({
      roleId: newRoleId,
      name: 'Test Role',
      color: '#123456',
      permissions: [Permission.MANAGE_USERS],
      storageQuotaOverrideEnabled: false,
      storageSpaceQuota: 0
    });

    await caller.users.addRole({
      userId: 2,
      roleId: newRoleId
    });

    const newUser = await tdb
      .insert(users)
      .values({
        identity: 'tempidentity',
        name: 'Another User',
        avatarId: null,
        password: 'password',
        bannerId: null,
        bio: null,
        profileColor: '#262626',
        createdAt: Date.now()
      })
      .returning({ id: users.id })
      .get();

    const { caller: nonOwnerCaller } = await initTest(2);

    await expect(
      nonOwnerCaller.users.addRole({
        userId: newUser.id,
        roleId: OWNER_ROLE_ID
      })
    ).rejects.toThrow(
      'Only users with the owner role can assign the owner role'
    );
  });

  test('should throw when non-owner user tries to remove owner role from someone else', async () => {
    const { caller } = await initTest();
    const newRoleId = await caller.roles.add();

    await caller.roles.update({
      roleId: newRoleId,
      name: 'Test Role',
      color: '#123456',
      permissions: [Permission.MANAGE_USERS],
      storageQuotaOverrideEnabled: false,
      storageSpaceQuota: 0
    });

    await caller.users.addRole({
      userId: 2,
      roleId: newRoleId
    });

    const { caller: nonOwnerCaller } = await initTest(2);

    await expect(
      nonOwnerCaller.users.removeRole({
        userId: 1,
        roleId: OWNER_ROLE_ID
      })
    ).rejects.toThrow(
      'Only users with the owner role can remove the owner role'
    );
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

  test('should refuse a new session for a banned user', async () => {
    const { caller } = await initTest();

    await caller.users.ban({
      userId: 2,
      reason: 'Violated community guidelines'
    });

    // the token stays cryptographically valid, the ban has to be what stops it
    await expect(getCaller(2)).rejects.toThrow('Invalid authentication token');
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

  test('should keep a message edited by the deleted user', async () => {
    const { caller } = await initTest();

    const messageBefore = await tdb
      .select()
      .from(messages)
      .where(eq(messages.id, 1))
      .get();

    expect(messageBefore).toBeDefined();
    expect(messageBefore!.userId).not.toBe(2);

    await tdb
      .update(messages)
      .set({ editedBy: 2, editedAt: Date.now() })
      .where(eq(messages.id, 1));

    await caller.users.delete({ userId: 2, wipe: false });

    const messageAfter = await tdb
      .select()
      .from(messages)
      .where(eq(messages.id, 1))
      .get();

    expect(messageAfter).toBeDefined();
    expect(messageAfter!.userId).toBe(messageBefore!.userId);
    expect(messageAfter!.editedBy).toBeNull();
  });

  test('should delete a second user who shared a reaction with the first', async () => {
    const { caller } = await initTest();

    const now = Date.now();

    await tdb.insert(messageReactions).values([
      {
        messageId: 1,
        userId: 2,
        emoji: '👍',
        fileId: null,
        createdAt: now
      },
      {
        messageId: 1,
        userId: 3,
        emoji: '👍',
        fileId: null,
        createdAt: now
      }
    ]);

    await caller.users.delete({ userId: 2, wipe: false });
    await caller.users.delete({ userId: 3, wipe: false });

    const remainingUsers = await tdb
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, 3));

    expect(remainingUsers.length).toBe(0);

    const placeholder = await tdb
      .select({ id: users.id })
      .from(users)
      .where(eq(users.identity, DELETED_USER_IDENTITY_AND_NAME))
      .get();

    // the two reactions collapse into the one row the placeholder can hold
    const reactions = await tdb
      .select({ userId: messageReactions.userId })
      .from(messageReactions)
      .where(
        and(eq(messageReactions.messageId, 1), eq(messageReactions.emoji, '👍'))
      );

    expect(reactions.length).toBe(1);
    expect(reactions[0]!.userId).toBe(placeholder!.id);
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

  test('should kick every session of a connected user', async () => {
    const firstTab = createFakeSocket();
    const secondTab = createFakeSocket();

    const { caller } = await initTest(1, undefined, {
      getUserWs: (userId) => (userId === 2 ? [firstTab, secondTab] : [])
    });

    await caller.users.kick({ userId: 2, reason: 'Take a break' });

    const closed = { code: DisconnectCode.KICKED, reason: 'Take a break' };

    expect(firstTab.closes).toEqual([closed]);
    expect(secondTab.closes).toEqual([closed]);

    const row = await tdb
      .select({ tokenVersion: users.tokenVersion })
      .from(users)
      .where(eq(users.id, 2))
      .get();

    expect(row?.tokenVersion).toBe(1);
  });

  test('should refuse the token a kicked session was holding', async () => {
    const socket = createFakeSocket();

    const { caller } = await initTest(1, undefined, {
      getUserWs: (userId) => (userId === 2 ? [socket] : [])
    });

    await caller.users.kick({ userId: 2 });

    // the token stays cryptographically valid, the bumped version has to be what stops it
    await expect(getCaller(2)).rejects.toThrow('Invalid authentication token');
  });

  test('should let a kicked user open a new session right away', async () => {
    const socket = createFakeSocket();

    const { caller } = await initTest(1, undefined, {
      getUserWs: (userId) => (userId === 2 ? [socket] : [])
    });

    await caller.users.kick({ userId: 2 });

    const response = await login('testuser', 'password123');

    expect(response.status).toBe(200);

    const { token } = (await response.json()) as { token: string };

    // a kick ends the session without barring re-entry, so the fresh token has to carry the
    // bumped version. minting it from a stale read would lock the user out until the next kick
    expect(await getUserByToken(token)).toBeDefined();
  });

  test('should close every session of a banned user', async () => {
    const firstTab = createFakeSocket();
    const secondTab = createFakeSocket();

    const { caller } = await initTest(1, undefined, {
      getUserWs: (userId) => (userId === 2 ? [firstTab, secondTab] : [])
    });

    await caller.users.ban({
      userId: 2,
      reason: 'Violated community guidelines'
    });

    const closed = {
      code: DisconnectCode.BANNED,
      reason: 'Violated community guidelines'
    };

    expect(firstTab.closes).toEqual([closed]);
    expect(secondTab.closes).toEqual([closed]);
  });

  test('should close every session of a deleted user', async () => {
    const firstTab = createFakeSocket();
    const secondTab = createFakeSocket();

    const { caller } = await initTest(1, undefined, {
      getUserWs: (userId) => (userId === 2 ? [firstTab, secondTab] : [])
    });

    await caller.users.delete({ userId: 2 });

    const closed = {
      code: DisconnectCode.KICKED,
      reason: 'Your account has been deleted'
    };

    expect(firstTab.closes).toEqual([closed]);
    expect(secondTab.closes).toEqual([closed]);
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
      profileColor: '#abc123'
    });

    let info = await caller.users.getInfo({ userId: 1 });

    expect(info.user.profileColor).toBe('#abc123');

    await caller.users.update({
      name: 'Test',
      profileColor: '#f0f'
    });

    info = await caller.users.getInfo({ userId: 1 });

    expect(info.user.profileColor).toBe('#f0f');
  });

  test('should handle bio with special characters', async () => {
    const { caller } = await initTest();

    const specialBio = 'Hello! 👋 This is my bio with émojis & spëcial çhars';

    await caller.users.update({
      name: 'Test User',
      profileColor: '#000000',
      bio: specialBio
    });

    const info = await caller.users.getInfo({ userId: 1 });

    expect(info.user.bio).toBe(specialBio);
  });

  test('should handle multiple profile updates in sequence', async () => {
    const { caller } = await initTest();

    await caller.users.update({
      name: 'Name 1',
      profileColor: '#111111',
      bio: 'Bio 1'
    });

    await caller.users.update({
      name: 'Name 2',
      profileColor: '#222222',
      bio: 'Bio 2'
    });

    await caller.users.update({
      name: 'Final Name',
      profileColor: '#333333',
      bio: 'Final Bio'
    });

    const info = await caller.users.getInfo({ userId: 1 });

    expect(info.user.name).toBe('Final Name');
    expect(info.user.profileColor).toBe('#333333');
    expect(info.user.bio).toBe('Final Bio');
  });

  test('should throw when banning a non-existing user', async () => {
    const { caller } = await initTest();

    await expect(
      caller.users.ban({
        userId: 9999
      })
    ).rejects.toThrow('User not found');
  });

  test('should throw when unbanning a non-existing user', async () => {
    const { caller } = await initTest();

    await expect(
      caller.users.unban({
        userId: 9999
      })
    ).rejects.toThrow('User not found');
  });

  test('should reject a new password equal to the current one', async () => {
    const { caller } = await initTest();

    await expect(
      caller.users.updatePassword({
        currentPassword: 'password123',
        newPassword: 'password123',
        confirmNewPassword: 'password123'
      })
    ).rejects.toThrow('New password must be different from the current one');
  });

  test('should not let a moderator assign a role holding permissions they lack', async () => {
    const { caller: owner } = await initTest();
    const roleId = await owner.roles.add();

    await owner.roles.update({
      roleId,
      name: 'Higher Role',
      color: '#00ff00',
      permissions: [Permission.MANAGE_SETTINGS],
      storageQuotaOverrideEnabled: false,
      storageSpaceQuota: 0
    });

    const { caller } = await initTest(5);

    await expect(
      caller.users.addRole({
        userId: 5,
        roleId
      })
    ).rejects.toThrow(
      'You cannot assign a role with permissions that you do not have'
    );

    const assigned = await tdb
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, 5), eq(userRoles.roleId, roleId)));

    expect(assigned.length).toBe(0);
  });

  test('should throw when adding a non-existing role to a user', async () => {
    const { caller } = await initTest();

    await expect(
      caller.users.addRole({
        userId: 2,
        roleId: 9999
      })
    ).rejects.toThrow('Role not found');
  });

  test('should not let a moderator ban the owner', async () => {
    const { caller } = await initTest(5);

    await expect(
      caller.users.ban({
        userId: 1
      })
    ).rejects.toThrow('Only users with the owner role can act on the server');

    const [owner] = await tdb.select().from(users).where(eq(users.id, 1));

    expect(owner!.banned).toBeFalsy();
  });

  test('should not let a moderator kick the owner', async () => {
    const { caller } = await initTest(5);

    await expect(
      caller.users.kick({
        userId: 1
      })
    ).rejects.toThrow('Only users with the owner role can act on the server');
  });

  test('should not let a moderator delete the owner', async () => {
    const { caller } = await initTest(5);

    await expect(
      caller.users.delete({
        userId: 1,
        wipe: true
      })
    ).rejects.toThrow('Only users with the owner role can act on the server');

    const [owner] = await tdb.select().from(users).where(eq(users.id, 1));

    expect(owner).toBeDefined();
  });

  test('should not let a moderator change the owner roles', async () => {
    const { caller } = await initTest(5);

    await expect(
      caller.users.addRole({
        userId: 1,
        roleId: 3
      })
    ).rejects.toThrow('Only users with the owner role can act on the server');

    await expect(
      caller.users.removeRole({
        userId: 1,
        roleId: OWNER_ROLE_ID
      })
    ).rejects.toThrow('Only users with the owner role can');
  });

  test('should let a moderator ban a regular user', async () => {
    const { caller } = await initTest(5);

    await caller.users.ban({
      userId: 2
    });

    const [target] = await tdb.select().from(users).where(eq(users.id, 2));

    expect(target!.banned).toBe(true);
  });

  test('should let the owner act on another owner-role holder', async () => {
    await tdb.insert(userRoles).values({
      userId: 2,
      roleId: OWNER_ROLE_ID,
      createdAt: Date.now()
    });

    const { caller } = await initTest();

    await caller.users.ban({
      userId: 2
    });

    const [target] = await tdb.select().from(users).where(eq(users.id, 2));

    expect(target!.banned).toBe(true);
  });

  test('should not return dm messages in user info', async () => {
    const { caller } = await initTest();

    const dbMessages = await tdb
      .select()
      .from(messages)
      .where(eq(messages.userId, 3))
      .all();

    const userInfo = await caller.users.getInfo({
      userId: 3
    });

    expect(userInfo.messages.length).toBe(0);
    expect(dbMessages.length).toBeGreaterThan(0);
  });
});
