import { describe, expect, test } from 'bun:test';
import { getCaller, initTest } from '../../__tests__/helpers';
import { TEST_SECRET_TOKEN } from '../../__tests__/seed';

describe('others router', () => {
  test('should throw when user tries to join with no handshake', async () => {
    const { caller } = await getCaller(1);

    await expect(
      caller.others.joinServer({
        handshakeHash: ''
      })
    ).rejects.toThrow('Invalid handshake hash');
  });

  test('should allow user to join with valid handshake', async () => {
    const joiningUserId = 1;

    const { caller } = await getCaller(joiningUserId);
    const { handshakeHash } = await caller.others.handshake();

    const result = await caller.others.joinServer({
      handshakeHash
    });

    expect(result).toHaveProperty('categories');
    expect(result).toHaveProperty('channels');
    expect(result).toHaveProperty('users');
    expect(result).toHaveProperty('serverId');
    expect(result).toHaveProperty('serverName');
    expect(result).toHaveProperty('ownUserId');
    expect(result).toHaveProperty('voiceMap');
    expect(result).toHaveProperty('roles');
    expect(result).toHaveProperty('emojis');
    expect(result).toHaveProperty('channelPermissions');

    expect(result.ownUserId).toBe(joiningUserId);
  });

  test('should ask for password if server has one set', async () => {
    const { caller } = await initTest(1);
    const { hasPassword } = await caller.others.handshake();

    expect(hasPassword).toBe(false);

    await caller.others.updateSettings({
      password: 'testpassword'
    });

    const { hasPassword: hasPasswordAfter } = await caller.others.handshake();

    expect(hasPasswordAfter).toBe(true);
  });

  test('should update server settings', async () => {
    const { caller } = await initTest(1);

    const newSettings = {
      name: 'Updated Test Server',
      description: 'An updated description',
      allowNewUsers: false,
      storageUploadEnabled: false
    };

    await caller.others.updateSettings(newSettings);

    const settings = await caller.others.getSettings();

    expect(settings.name).toBe(newSettings.name);
    expect(settings.description).toBe(newSettings.description);
    expect(settings.allowNewUsers).toBe(newSettings.allowNewUsers);
    expect(settings.storageUploadEnabled).toBe(
      newSettings.storageUploadEnabled
    );
  });

  test('should throw when using invalid secret token', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.others.useSecretToken({ token: 'invalid-token' })
    ).rejects.toThrow('Invalid secret token');
  });

  test('should accept valid secret token and assign owner role', async () => {
    const { caller } = await initTest(2);

    await caller.others.useSecretToken({ token: TEST_SECRET_TOKEN });

    const allUsers = await caller.users.getAll();
    const updatedUser = allUsers.find((u) => u.id === 2);

    expect(updatedUser).toBeDefined();
    expect(updatedUser?.roleIds).toContain(1);
  });

  test.skip('should change logo', async () => {
    // TODO: implement file upload mocking
  });
});
