import {
  ActivityLogType,
  DEFAULT_RATE_LIMITERS,
  Permission,
  RATE_LIMIT_MIN_GLOBAL_REQUESTS,
  RATE_LIMIT_MIN_WINDOW_MS,
  RateLimiter,
  STORAGE_MAX_FILES_PER_MESSAGE,
  type TRateLimiters,
  type TTempFile
} from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import {
  getCaller,
  initTest,
  login,
  uploadFile
} from '../../__tests__/helpers';
import { TEST_SECRET_TOKEN } from '../../__tests__/seed';
import { tdb } from '../../__tests__/setup';
import { config } from '../../config';
import { getSettings } from '../../db/queries/server';
import { activityLog, rolePermissions } from '../../db/schema';
import { getRateLimit, getRateLimits } from '../../helpers/rate-limits';
import { pluginManager } from '../../plugins';
import { drainActivityLogQueue } from '../../queues/activity-log';
import { drainLoginsQueue } from '../../queues/logins';
import { VoiceRuntime } from '../../runtimes/voice';

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
    expect(result).toHaveProperty('commands');
    expect(result).toHaveProperty('pluginIdsWithComponents');

    expect(result.ownUserId).toBe(joiningUserId);

    for (const user of result.users) {
      expect(user._identity).toBeUndefined();
    }
  });

  // the private voice channel is visible to the owner only
  test('should leave the calls of hidden channels out of the voice map', async () => {
    const privateCall = new VoiceRuntime(4);
    const publicCall = new VoiceRuntime(2);

    privateCall.addUser(1, { micMuted: false, soundMuted: false });
    publicCall.addUser(3, { micMuted: false, soundMuted: false });

    try {
      const { caller: owner } = await getCaller(1);
      const { handshakeHash: ownerHash } = await owner.others.handshake();
      const ownerJoin = await owner.others.joinServer({
        handshakeHash: ownerHash
      });

      const { caller: member } = await getCaller(2);
      const { handshakeHash: memberHash } = await member.others.handshake();
      const memberJoin = await member.others.joinServer({
        handshakeHash: memberHash
      });

      expect(Object.keys(ownerJoin.voiceMap).sort()).toEqual(['2', '4']);
      expect(Object.keys(memberJoin.voiceMap)).toEqual(['2']);
      expect(Object.keys(memberJoin.externalStreamsMap)).toEqual(['2']);
    } finally {
      await privateCall.destroy();
      await publicCall.destroy();
    }
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

  test('should only ask for password on first join when setting is enabled', async () => {
    const { caller } = await initTest(1);

    // joining queues the login row rather than awaiting it, and "has this user joined before"
    // reads that row. without the drain this passes only when a full run happens to give the
    // queue enough turns, and fails when the file runs alone
    await drainLoginsQueue();

    await caller.others.updateSettings({
      password: 'testpassword',
      onlyAskForPasswordOnFirstJoin: true
    });

    const { hasPassword: ownerHasPassword } = await caller.others.handshake();

    expect(ownerHasPassword).toBe(false);

    const { caller: secondUserCaller } = await getCaller(2);
    const { hasPassword: secondUserHasPassword } =
      await secondUserCaller.others.handshake();

    expect(secondUserHasPassword).toBe(true);
  });

  test('should reject a wrong server password of either length', async () => {
    const { caller } = await initTest(1);

    await caller.others.updateSettings({
      password: 'testpassword',
      onlyAskForPasswordOnFirstJoin: false
    });

    const { caller: secondUserCaller } = await getCaller(2);
    const { handshakeHash } = await secondUserCaller.others.handshake();

    // safeCompare returns early on a length mismatch and runs timingSafeEqual otherwise,
    // so both shapes are worth covering
    await expect(
      secondUserCaller.others.joinServer({ handshakeHash, password: 'short' })
    ).rejects.toThrow('Invalid password');

    await expect(
      secondUserCaller.others.joinServer({
        handshakeHash,
        password: 'testpasswerd'
      })
    ).rejects.toThrow('Invalid password');

    const joined = await secondUserCaller.others.joinServer({
      handshakeHash,
      password: 'testpassword'
    });

    expect(joined.ownUserId).toBe(2);
  });

  test('should require password for first join and skip it afterwards when setting is enabled', async () => {
    const { caller } = await initTest(1);

    await caller.others.updateSettings({
      password: 'testpassword',
      onlyAskForPasswordOnFirstJoin: true
    });

    const { caller: secondUserCaller } = await getCaller(2);
    const { handshakeHash } = await secondUserCaller.others.handshake();

    await expect(
      secondUserCaller.others.joinServer({
        handshakeHash
      })
    ).rejects.toThrow('Invalid password');

    await secondUserCaller.others.joinServer({
      handshakeHash,
      password: 'testpassword'
    });

    // the skip-it-afterwards half depends on this join's login row being written
    await drainLoginsQueue();

    const { hasPassword } = await secondUserCaller.others.handshake();

    expect(hasPassword).toBe(false);

    const { handshakeHash: secondHandshakeHash } =
      await secondUserCaller.others.handshake();

    await expect(
      secondUserCaller.others.joinServer({
        handshakeHash: secondHandshakeHash
      })
    ).resolves.toBeDefined();
  });

  test('should update server settings', async () => {
    const { caller } = await initTest(1);

    const newSettings = {
      name: 'Updated Test Server',
      description: 'An updated description',
      allowNewUsers: false,
      directMessagesEnabled: false,
      storageUploadEnabled: false,
      storageFileSharingInDirectMessages: false,
      storageQuota: 10 * 1024 * 1024 * 1024,
      storageMaxAvatarSize: 2 * 1024 * 1024,
      storageMaxBannerSize: 4 * 1024 * 1024,
      storageMaxFilesPerMessage: 6,
      webRtcSimulcastEnabled: true,
      storageImageOptimizationEnabled: true,
      storageImageOptimizationQuality: 72
    };

    await caller.others.updateSettings(newSettings);

    const settings = await caller.others.getSettings();

    expect(settings.name).toBe(newSettings.name);
    expect(settings.description).toBe(newSettings.description);
    expect(settings.allowNewUsers).toBe(newSettings.allowNewUsers);
    expect(settings.directMessagesEnabled).toBe(
      newSettings.directMessagesEnabled
    );
    expect(settings.storageUploadEnabled).toBe(
      newSettings.storageUploadEnabled
    );
    expect(settings.storageFileSharingInDirectMessages).toBe(
      newSettings.storageFileSharingInDirectMessages
    );
    expect(settings.storageQuota).toBe(newSettings.storageQuota);
    expect(settings.storageMaxAvatarSize).toBe(
      newSettings.storageMaxAvatarSize
    );
    expect(settings.storageMaxBannerSize).toBe(
      newSettings.storageMaxBannerSize
    );
    expect(settings.storageMaxFilesPerMessage).toBe(
      newSettings.storageMaxFilesPerMessage
    );
    expect(settings.webRtcSimulcastEnabled).toBe(
      newSettings.webRtcSimulcastEnabled
    );
    expect(settings.storageImageOptimizationEnabled).toBe(
      newSettings.storageImageOptimizationEnabled
    );
    expect(settings.storageImageOptimizationQuality).toBe(
      newSettings.storageImageOptimizationQuality
    );
  });

  test('should refuse a per-message file cap send-message could never honour', async () => {
    const { caller } = await initTest(1);

    // send-message rejects at STORAGE_MAX_FILES_PER_MESSAGE in zod before it reads this
    // setting, so anything above it is a limit the server would never apply
    await expect(
      caller.others.updateSettings({
        storageMaxFilesPerMessage: STORAGE_MAX_FILES_PER_MESSAGE + 1
      })
    ).rejects.toThrow();

    await caller.others.updateSettings({
      storageMaxFilesPerMessage: STORAGE_MAX_FILES_PER_MESSAGE
    });

    const settings = await caller.others.getSettings();

    expect(settings.storageMaxFilesPerMessage).toBe(
      STORAGE_MAX_FILES_PER_MESSAGE
    );
  });

  describe('storage settings permissions', () => {
    const grantOnly = async (permissions: Permission[]) => {
      await tdb
        .delete(rolePermissions)
        .where(eq(rolePermissions.roleId, 2))
        .run();

      await tdb.insert(rolePermissions).values(
        permissions.map((permission) => ({
          roleId: 2,
          permission,
          createdAt: Date.now()
        }))
      );
    };

    test('should refuse a storage field without MANAGE_STORAGE', async () => {
      await grantOnly([Permission.MANAGE_SETTINGS]);

      const { caller } = await initTest(2);

      await expect(
        caller.others.updateSettings({ storageQuota: 123 })
      ).rejects.toThrow('Insufficient permissions');
    });

    test('should allow a storage field with MANAGE_STORAGE alone', async () => {
      await grantOnly([Permission.MANAGE_STORAGE]);

      const { caller } = await initTest(2);

      await caller.others.updateSettings({ storageQuota: 123 });

      const settings = await getSettings();

      expect(settings.storageQuota).toBe(123);
    });

    test('should refuse a non-storage field with MANAGE_STORAGE alone', async () => {
      await grantOnly([Permission.MANAGE_STORAGE]);

      const { caller } = await initTest(2);

      await expect(
        caller.others.updateSettings({ name: 'Renamed' })
      ).rejects.toThrow('Insufficient permissions');
    });

    test('should require both when the update mixes the two', async () => {
      await grantOnly([Permission.MANAGE_STORAGE]);

      const { caller } = await initTest(2);

      await expect(
        caller.others.updateSettings({ name: 'Renamed', storageQuota: 123 })
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  test('should let an admin read the join password back and clear it', async () => {
    const { caller } = await initTest(1);

    await caller.others.updateSettings({ password: 'testpassword' });

    const settings = await caller.others.getSettings();

    // the form shows what is actually set, which is what makes emptying it meaningful
    expect(settings.password).toBe('testpassword');

    // the ownership credential is a different thing and stays hidden
    expect('secretToken' in settings).toBe(false);

    await caller.others.updateSettings({ password: null });

    const { caller: joiner } = await getCaller(2);
    const { hasPassword } = await joiner.others.handshake();

    expect(hasPassword).toBe(false);
  });

  test('should keep the server password when saving unrelated settings', async () => {
    const { caller } = await initTest(1);

    await caller.others.updateSettings({
      password: 'testpassword'
    });

    // the storage settings form sends exactly this shape, with no password
    await caller.others.updateSettings({
      storageUploadEnabled: false
    });

    const { caller: secondUserCaller } = await getCaller(2);
    const { hasPassword } = await secondUserCaller.others.handshake();

    expect(hasPassword).toBe(true);
  });

  test('should not touch plugins when saving unrelated settings', async () => {
    const { caller } = await initTest(1);

    let unloadCalls = 0;
    const originalUnload = pluginManager.unloadPlugins;

    pluginManager.unloadPlugins = async () => {
      unloadCalls++;
    };

    try {
      await caller.others.updateSettings({
        storageUploadEnabled: false
      });
    } finally {
      pluginManager.unloadPlugins = originalUnload;
    }

    expect(unloadCalls).toBe(0);
  });

  test('should not log the server password', async () => {
    const { caller } = await initTest(1);

    await caller.others.updateSettings({
      name: 'Logged Server',
      password: 'testpassword'
    });

    await Bun.sleep(20);

    const entries = await tdb
      .select({ details: activityLog.details })
      .from(activityLog)
      .where(eq(activityLog.type, ActivityLogType.EDIT_SERVER_SETTINGS));

    expect(entries.length).toBeGreaterThan(0);
    expect(JSON.stringify(entries)).not.toContain('testpassword');
  });

  test('should not expose server secrets in get settings', async () => {
    const { caller } = await initTest(1);

    await caller.others.updateSettings({
      password: 'testpassword'
    });

    const settings = await caller.others.getSettings();

    expect('secretToken' in settings).toBe(false);
  });

  test('should throw when user lacks permissions (update settings)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.others.updateSettings({
        name: 'Attempted Update'
      })
    ).rejects.toThrow('Insufficient permissions');
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

  test('should reject a second ownership claim instead of crashing', async () => {
    const { caller } = await initTest(2);

    await caller.others.useSecretToken({ token: TEST_SECRET_TOKEN });

    await expect(
      caller.others.useSecretToken({ token: TEST_SECRET_TOKEN })
    ).rejects.toThrow('You already have the owner role');
  });

  test('should log an ownership claim', async () => {
    const { caller } = await initTest(2);

    await caller.others.useSecretToken({ token: TEST_SECRET_TOKEN });

    await Bun.sleep(20);

    const entries = await tdb
      .select({ userId: activityLog.userId })
      .from(activityLog)
      .where(eq(activityLog.type, ActivityLogType.USER_CLAIMED_OWNERSHIP));

    expect(entries.length).toBe(1);
    expect(entries[0]!.userId).toBe(2);
  });

  test('should rate limit repeated secret token attempts', async () => {
    const { caller } = await initTest(2);
    const { maxRequests } = getRateLimit(RateLimiter.USE_SECRET_TOKEN);

    for (let i = 0; i < maxRequests; i++) {
      await expect(
        caller.others.useSecretToken({ token: 'invalid-token' })
      ).rejects.toThrow('Invalid secret token');
    }

    await expect(
      caller.others.useSecretToken({ token: 'invalid-token' })
    ).rejects.toThrow('Too many requests. Please try again shortly.');
  });

  test('should change logo', async () => {
    const { caller } = await initTest(1);

    const response = await login('testowner', 'password123');
    const { token } = (await response.json()) as { token: string };

    const logoFile = new File(['logo content'], 'logo.png', {
      type: 'image/png'
    });

    const uploadResponse = await uploadFile(logoFile, token);
    const tempFile = (await uploadResponse.json()) as TTempFile;

    expect(tempFile).toBeDefined();
    expect(tempFile.id).toBeDefined();

    const settingsBefore = await caller.others.getSettings();

    expect(settingsBefore.logo).toBeNull();

    await caller.others.changeLogo({ fileId: tempFile.id });

    const settingsAfter = await caller.others.getSettings();

    expect(settingsAfter.logo).toBeDefined();
    expect(settingsAfter.logo?.originalName).toBe(logoFile.name);

    await caller.others.changeLogo({});

    const settingsAfterRemoval = await caller.others.getSettings();

    expect(settingsAfterRemoval.logo).toBeNull();
  });

  test('should not let a user without MANAGE_SETTINGS change the logo', async () => {
    const { caller: admin, mockedToken: adminToken } = await initTest(1);

    const logoFile = new File(['owner logo'], 'owner-logo.png', {
      type: 'image/png'
    });
    const uploadResponse = await uploadFile(logoFile, adminToken);
    const tempFile = (await uploadResponse.json()) as TTempFile;

    await admin.others.changeLogo({ fileId: tempFile.id });

    const { caller: user } = await initTest(2);

    await expect(user.others.changeLogo({})).rejects.toThrow(
      'Insufficient permissions'
    );

    await expect(
      user.others.changeLogo({ fileId: 'does-not-exist' })
    ).rejects.toThrow('Insufficient permissions');

    const settings = await admin.others.getSettings();

    expect(settings.logo?.originalName).toBe('owner-logo.png');
  });

  test('should keep the existing logo when a replacement cannot be saved', async () => {
    const { caller, mockedToken: token } = await initTest();

    const logoFile = new File(['a logo'], 'keep-me.png', { type: 'image/png' });
    const uploadResponse = await uploadFile(logoFile, token);
    const tempFile = (await uploadResponse.json()) as TTempFile;

    await caller.others.changeLogo({ fileId: tempFile.id });

    const before = await caller.others.getSettings();

    expect(before.logo?.originalName).toBe('keep-me.png');

    // the route used to delete first and save second, so a rejected save left the server
    // with no logo at all
    await expect(
      caller.others.changeLogo({ fileId: 'does-not-exist' })
    ).rejects.toThrow();

    const after = await caller.others.getSettings();

    expect(after.logo?.originalName).toBe('keep-me.png');
  });

  test('should rate limit excessive join attempts', async () => {
    const { caller } = await getCaller(1);

    for (let i = 0; i < 5; i++) {
      await expect(
        caller.others.joinServer({
          handshakeHash: ''
        })
      ).rejects.toThrow('Invalid handshake hash');
    }

    await expect(
      caller.others.joinServer({
        handshakeHash: ''
      })
    ).rejects.toThrow('Too many requests. Please try again shortly.');
  });

  describe('rate limits', () => {
    const withOverride = (
      rateLimiter: RateLimiter,
      maxRequests: number
    ): TRateLimiters => ({
      ...DEFAULT_RATE_LIMITERS,
      overrides: {
        ...DEFAULT_RATE_LIMITERS.overrides,
        [rateLimiter]: { maxRequests, windowMs: 60_000 }
      }
    });

    test('should return the defaults when nothing was saved', async () => {
      const { caller } = await initTest(1);

      expect(await caller.others.getRateLimits()).toEqual({
        rateLimits: DEFAULT_RATE_LIMITERS,
        enabledInConfig: true
      });
    });

    test('should report when config.ini has the limits turned off', async () => {
      const { caller } = await initTest(1);

      config.server.rateLimitersEnabled = false;

      try {
        const { enabledInConfig } = await caller.others.getRateLimits();

        expect(enabledInConfig).toBe(false);
      } finally {
        config.server.rateLimitersEnabled = true;
      }
    });

    test('should stop limiting once the limits are turned off', async () => {
      const { caller } = await initTest(1);

      await caller.others.updateRateLimits({
        ...withOverride(RateLimiter.SIGNAL_TYPING, 1),
        enabled: false
      });

      await caller.messages.signalTyping({ channelId: 1 });

      await expect(
        caller.messages.signalTyping({ channelId: 1 })
      ).resolves.toBeUndefined();
    });

    test('should persist the new limits and serve them back', async () => {
      const { caller } = await initTest(1);
      const rateLimits = withOverride(RateLimiter.SEARCH, 3);

      await caller.others.updateRateLimits(rateLimits);

      const settings = await getSettings();

      expect(settings.rateLimiters).toEqual(rateLimits);
      const { rateLimits: served } = await caller.others.getRateLimits();

      expect(served).toEqual(rateLimits);
      expect(getRateLimits()).toEqual(rateLimits);
    });

    test('should apply a new override to the next request', async () => {
      const { caller } = await initTest(1);

      await caller.others.updateRateLimits(
        withOverride(RateLimiter.SIGNAL_TYPING, 1)
      );

      await caller.messages.signalTyping({ channelId: 1 });

      await expect(
        caller.messages.signalTyping({ channelId: 1 })
      ).rejects.toThrow('Too many requests. Please try again shortly.');
    });

    test('should apply the global limit to a route without an override', async () => {
      const { caller } = await initTest(1);

      await caller.others.updateRateLimits({
        ...DEFAULT_RATE_LIMITERS,
        global: {
          maxRequests: RATE_LIMIT_MIN_GLOBAL_REQUESTS,
          windowMs: 60_000
        }
      });

      // the update itself was the first request on its own route, the rest use another
      for (let i = 0; i < RATE_LIMIT_MIN_GLOBAL_REQUESTS; i++) {
        await caller.others.getRateLimits();
      }

      await expect(caller.others.getRateLimits()).rejects.toThrow(
        'Too many requests. Please try again shortly.'
      );

      // each route counts on its own, so exhausting one leaves the others usable
      await expect(caller.others.getSettings()).resolves.toBeDefined();
    });

    test('should let an override allow more than the global limit', async () => {
      const { caller } = await initTest(1);

      await caller.others.updateRateLimits({
        ...withOverride(RateLimiter.SIGNAL_TYPING, 50),
        global: {
          maxRequests: RATE_LIMIT_MIN_GLOBAL_REQUESTS,
          windowMs: 60_000
        }
      });

      for (let i = 0; i < 50; i++) {
        await caller.messages.signalTyping({ channelId: 1 });
      }

      await expect(
        caller.messages.signalTyping({ channelId: 1 })
      ).rejects.toThrow('Too many requests. Please try again shortly.');
    });

    test('should log the change in the activity log', async () => {
      const { caller } = await initTest(1);
      const rateLimits = withOverride(RateLimiter.SEARCH, 3);

      await caller.others.updateRateLimits(rateLimits);
      await drainActivityLogQueue();

      const entry = await tdb
        .select({ userId: activityLog.userId, details: activityLog.details })
        .from(activityLog)
        .where(eq(activityLog.type, ActivityLogType.EDIT_SERVER_SETTINGS))
        .get();

      expect(entry).toEqual({
        userId: 1,
        details: { values: { rateLimiters: rateLimits } }
      });
    });

    test('should refuse to read the limits without MANAGE_SETTINGS', async () => {
      const { caller } = await initTest(2);

      await expect(caller.others.getRateLimits()).rejects.toThrow(
        'Insufficient permissions'
      );
    });

    test('should refuse to update the limits without MANAGE_SETTINGS', async () => {
      const { caller } = await initTest(2);

      await expect(
        caller.others.updateRateLimits(DEFAULT_RATE_LIMITERS)
      ).rejects.toThrow('Insufficient permissions');

      const settings = await getSettings();

      expect(settings.rateLimiters).toBeNull();
    });

    test('should refuse a global limit below the minimum', async () => {
      const { caller } = await initTest(1);

      await expect(
        caller.others.updateRateLimits({
          ...DEFAULT_RATE_LIMITERS,
          global: {
            maxRequests: RATE_LIMIT_MIN_GLOBAL_REQUESTS - 1,
            windowMs: 60_000
          }
        })
      ).rejects.toThrow();
    });

    test('should refuse a window below the minimum', async () => {
      const { caller } = await initTest(1);

      await expect(
        caller.others.updateRateLimits({
          ...DEFAULT_RATE_LIMITERS,
          overrides: {
            ...DEFAULT_RATE_LIMITERS.overrides,
            [RateLimiter.SEARCH]: {
              maxRequests: 10,
              windowMs: RATE_LIMIT_MIN_WINDOW_MS - 1
            }
          }
        })
      ).rejects.toThrow();
    });

    test('should refuse an override with no requests allowed', async () => {
      const { caller } = await initTest(1);

      await expect(
        caller.others.updateRateLimits(withOverride(RateLimiter.SEARCH, 0))
      ).rejects.toThrow();
    });

    test('should refuse limits with an override missing', async () => {
      const { caller } = await initTest(1);
      const { search: _search, ...overrides } = DEFAULT_RATE_LIMITERS.overrides;

      await expect(
        caller.others.updateRateLimits({
          ...DEFAULT_RATE_LIMITERS,
          // @ts-expect-error the route has to reject a partial set sent by an older client
          overrides
        })
      ).rejects.toThrow();
    });
  });
});
