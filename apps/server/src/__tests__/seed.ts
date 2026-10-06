/**
 * The fixture every test runs against. A fresh in-memory database is created, migrated and
 * seeded before each test (see setup.ts), so tests reference these by id rather than
 * inserting their own copies.
 *
 * AGENTS.md: extend this file rather than adding a createX() fixture helper to a test file,
 * append new rows **after** the existing ones so the ids already asserted on do not shift,
 * and update the counts in setup.test.ts, which guards this summary against drift.
 *
 * Seeded for unit and integration tests:
 *
 *   settings          1    server name "Test Server", secret token TEST_SECRET_TOKEN
 *   users             5    1 testowner (owner), 2 testuser (low permissions, used for
 *                          every "lacks permission" case), usera, userb, testmoderator
 *   roles             4    Owner (id 1), Member, Guest, Moderator
 *   userRoles         5    one per user, plus the moderator's extra role
 *   rolePermissions  32    the default permission sets for the roles above
 *   categories        2    Text Channels, Voice Channels
 *   channels          5    1 General (text), Voice, DM Channel, Private Voice,
 *                          Restricted Text
 *   messages          2    both in channel 1
 *   directMessages    1    the DM pair backing "DM Channel"
 *   channelRolePermissions
 *                     1    the default role may view channel 5
 *   channelUserPermissions
 *                     1    user 2 is denied viewing channel 5, overriding that grant
 *   logins            0    seeded only when seedTestDb is called with { e2e: true },
 *                          which only packages/e2e's seed-db.ts does
 *
 * User 1 is the admin used for happy paths and user 2 the low-permission user used for
 * rejections, which is the convention the router tests follow.
 */
import {
  ChannelPermission,
  ChannelType,
  DEFAULT_ROLE_PERMISSIONS,
  OWNER_ROLE_ID,
  Permission,
  sha256,
  STORAGE_DEFAULT_IMAGE_OPTIMIZATION_QUALITY,
  STORAGE_DEFAULT_MAX_AVATAR_SIZE,
  STORAGE_DEFAULT_MAX_BANNER_SIZE,
  STORAGE_DEFAULT_MAX_FILES_PER_MESSAGE,
  STORAGE_DEFAULT_SIGNED_URLS_TTL_SECONDS,
  STORAGE_MAX_FILE_SIZE,
  STORAGE_MIN_QUOTA_PER_USER,
  STORAGE_OVERFLOW_ACTION,
  STORAGE_QUOTA,
  type TDirectMessage,
  type TICategory,
  type TIChannel,
  type TIMessage,
  type TIRole,
  type TISettings,
  type TIUser
} from '@sharkord/shared';
import { randomUUIDv7 } from 'bun';
import { type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import {
  categories,
  channelRolePermissions,
  channels,
  channelUserPermissions,
  directMessages,
  logins,
  messages,
  rolePermissions,
  roles,
  settings,
  userRoles,
  users
} from '../db/schema';
import { seedE2E } from './e2e-mocks/seed-e2e';

const TEST_SECRET_TOKEN = 'test-secret-token-for-unit-tests';

const hashedPassword = await Bun.password.hash('password123');

/**
 * Current mocked data in the database after seeding (not complete, just a summary):
 *
 * Users:
 * - Test Owner (owner) (1)
 * - Test User (member) (2)
 * - User A (member) (3)
 * - User B (member) (4)
 * - Test Moderator (moderator) (5) (MANAGE_USERS + MANAGE_ROLES, no owner role)
 * Roles:
 * - Owner (1)
 * - Member (2) (default)
 * - Guest (3)
 * - Moderator (4) (MANAGE_USERS + MANAGE_ROLES only)
 * Channels:
 * - General (1)
 * - Voice (2)
 * - DM Channel (3) (between User A and User B)
 * - Private Voice (4) (private, nobody has channel permissions on it)
 * Messages:
 * - Test message (1) (in General, by Test Owner)
 * - Hello User B (2) (in DM Channel, by User A)
 */

const seedTestDb = async (
  db: BunSQLiteDatabase,
  { e2e = false }: { e2e?: boolean } = {}
) => {
  const firstStart = Date.now();

  const initialSettings: TISettings = {
    name: 'Test Server',
    description: 'Test server description',
    password: '',
    onlyAskForPasswordOnFirstJoin: false,
    serverId: randomUUIDv7(),
    secretToken: await sha256(TEST_SECRET_TOKEN),
    allowNewUsers: true,
    directMessagesEnabled: true,
    storageUploadEnabled: true,
    storageQuota: STORAGE_QUOTA,
    storageUploadMaxFileSize: STORAGE_MAX_FILE_SIZE,
    storageMaxAvatarSize: STORAGE_DEFAULT_MAX_AVATAR_SIZE,
    storageMaxBannerSize: STORAGE_DEFAULT_MAX_BANNER_SIZE,
    storageMaxFilesPerMessage: STORAGE_DEFAULT_MAX_FILES_PER_MESSAGE,
    storageFileSharingInDirectMessages: true,
    storageSpaceQuotaByUser: STORAGE_MIN_QUOTA_PER_USER,
    storageOverflowAction: STORAGE_OVERFLOW_ACTION,
    enablePlugins: false,
    enableSearch: true,
    webRtcSimulcastEnabled: false,
    showWelcomeDialog: true,
    storageSignedUrlsEnabled: false,
    storageSignedUrlsTtlSeconds: STORAGE_DEFAULT_SIGNED_URLS_TTL_SECONDS,
    storageImageOptimizationEnabled: false,
    storageImageOptimizationQuality: STORAGE_DEFAULT_IMAGE_OPTIMIZATION_QUALITY
  };

  await db.insert(settings).values(initialSettings);

  const initialCategories: TICategory[] = [
    {
      name: 'Text Channels',
      position: 1,
      createdAt: firstStart
    },
    {
      name: 'Voice Channels',
      position: 2,
      createdAt: firstStart
    }
  ];

  await db.insert(categories).values(initialCategories);

  const initialChannels: TIChannel[] = [
    {
      type: ChannelType.TEXT,
      name: 'General',
      position: 0,
      categoryId: 1,
      topic: 'General text channel',
      createdAt: firstStart
    },
    {
      type: ChannelType.VOICE,
      name: 'Voice',
      position: 1,
      categoryId: 2,
      topic: 'General voice channel',
      createdAt: firstStart
    }
  ];

  await db.insert(channels).values(initialChannels);

  const ownerRole: TIRole = {
    id: OWNER_ROLE_ID,
    name: 'Owner',
    color: '#ff0000',
    isPersistent: true,
    isDefault: false,
    storageQuotaOverrideEnabled: false,
    storageSpaceQuota: 0,
    createdAt: firstStart
  };

  await db.insert(roles).values(ownerRole);

  const ownerPermissions = Object.values(Permission).map((permission) => ({
    roleId: OWNER_ROLE_ID,
    permission,
    createdAt: firstStart
  }));

  await db.insert(rolePermissions).values(ownerPermissions);

  const defaultRole: TIRole = {
    name: 'Member',
    color: '#99aab5',
    isPersistent: true,
    isDefault: true,
    storageQuotaOverrideEnabled: false,
    storageSpaceQuota: 0,
    createdAt: firstStart
  };

  const [insertedDefaultRole] = await db
    .insert(roles)
    .values(defaultRole)
    .returning();

  const defaultPermissions = DEFAULT_ROLE_PERMISSIONS.map((permission) => ({
    roleId: insertedDefaultRole!.id,
    permission,
    createdAt: firstStart
  }));

  await db.insert(rolePermissions).values(defaultPermissions);

  const guestRole: TIRole = {
    name: 'Guest',
    color: '#95a5a6',
    isPersistent: false,
    isDefault: false,
    storageQuotaOverrideEnabled: false,
    storageSpaceQuota: 0,
    createdAt: firstStart
  };

  await db.insert(roles).values(guestRole);

  const ownerUser: TIUser = {
    name: 'Test Owner',
    identity: 'testowner',
    password: hashedPassword,
    avatarId: null,
    bannerId: null,
    bio: null,
    createdAt: firstStart
  };

  const [insertedOwner] = await db.insert(users).values(ownerUser).returning();

  await db.insert(userRoles).values({
    userId: insertedOwner!.id,
    roleId: OWNER_ROLE_ID,
    createdAt: firstStart
  });

  const regularUser: TIUser = {
    name: 'Test User',
    identity: 'testuser',
    password: hashedPassword,
    avatarId: null,
    bannerId: null,
    bio: null,
    createdAt: firstStart
  };

  const [insertedUser] = await db.insert(users).values(regularUser).returning();

  await db.insert(userRoles).values({
    userId: insertedUser!.id,
    roleId: insertedDefaultRole!.id,
    createdAt: firstStart
  });

  const testMessage: TIMessage = {
    userId: insertedOwner!.id,
    channelId: 1,
    content: 'Test message',
    metadata: null,
    createdAt: firstStart
  };

  await db.insert(messages).values(testMessage);

  // add two more users and a dm channel between them for DM-related tests
  const userA: TIUser = {
    name: 'User A',
    identity: 'usera',
    password: hashedPassword,
    avatarId: null,
    bannerId: null,
    bio: null,
    createdAt: firstStart
  };

  const userB: TIUser = {
    name: 'User B',
    identity: 'userb',
    password: hashedPassword,
    avatarId: null,
    bannerId: null,
    bio: null,
    createdAt: firstStart
  };

  const [insertedUserA] = await db.insert(users).values(userA).returning();
  const [insertedUserB] = await db.insert(users).values(userB).returning();

  await db.insert(userRoles).values([
    {
      userId: insertedUserA!.id,
      roleId: insertedDefaultRole!.id,
      createdAt: firstStart
    },
    {
      userId: insertedUserB!.id,
      roleId: insertedDefaultRole!.id,
      createdAt: firstStart
    }
  ]);

  const dmChannel: TIChannel = {
    type: ChannelType.VOICE,
    name: 'DM Channel',
    position: 0,
    isDm: true,
    private: true,
    categoryId: null,
    topic: null,
    createdAt: firstStart
  };

  const [insertedDmChannel] = await db
    .insert(channels)
    .values(dmChannel)
    .returning();

  const directMessage: TDirectMessage = {
    userOneId: insertedUserA!.id,
    userTwoId: insertedUserB!.id,
    channelId: 3,
    createdAt: firstStart
  };

  await db.insert(directMessages).values(directMessage);

  const dmMessage: TIMessage = {
    userId: insertedUserA!.id,
    channelId: insertedDmChannel!.id,
    content: 'Hello User B',
    metadata: null,
    createdAt: firstStart
  };

  await db.insert(messages).values(dmMessage);

  // seeded after the dm channel so the ids above stay stable for existing tests
  const privateVoiceChannel: TIChannel = {
    type: ChannelType.VOICE,
    name: 'Private Voice',
    position: 2,
    private: true,
    categoryId: 2,
    topic: null,
    createdAt: firstStart
  };

  const [insertedPrivateVoiceChannel] = await db
    .insert(channels)
    .values(privateVoiceChannel)
    .returning();

  // an actor holding an admin permission without the owner role, for the
  // privilege checks that need someone between the owner and a plain member
  const moderatorRole: TIRole = {
    name: 'Moderator',
    color: '#00ff00',
    isPersistent: false,
    isDefault: false,
    storageQuotaOverrideEnabled: false,
    storageSpaceQuota: 0,
    createdAt: firstStart
  };

  const [insertedModeratorRole] = await db
    .insert(roles)
    .values(moderatorRole)
    .returning();

  await db.insert(rolePermissions).values([
    {
      roleId: insertedModeratorRole!.id,
      permission: Permission.MANAGE_USERS,
      createdAt: firstStart
    },
    {
      roleId: insertedModeratorRole!.id,
      permission: Permission.MANAGE_ROLES,
      createdAt: firstStart
    }
  ]);

  const moderatorUser: TIUser = {
    name: 'Test Moderator',
    identity: 'testmoderator',
    password: hashedPassword,
    avatarId: null,
    bannerId: null,
    bio: null,
    createdAt: firstStart
  };

  const [insertedModerator] = await db
    .insert(users)
    .values(moderatorUser)
    .returning();

  await db.insert(userRoles).values({
    userId: insertedModerator!.id,
    roleId: insertedModeratorRole!.id,
    createdAt: firstStart
  });

  // a private channel the default role can view, with user 2 denied on top of that grant.
  // the one shape where the user level row and the role grant disagree, which is what
  // channelUserCan and getAffectedUserIdsForChannel have to resolve the same way
  // categoryId null like the dm channel, so it stays out of every category ordering and the
  // reorder tests keep asserting the positions they were written against
  const restrictedChannel: TIChannel = {
    type: ChannelType.TEXT,
    name: 'Restricted Text',
    position: 0,
    private: true,
    categoryId: null,
    topic: null,
    createdAt: firstStart
  };

  const [insertedRestrictedChannel] = await db
    .insert(channels)
    .values(restrictedChannel)
    .returning();

  await db.insert(channelRolePermissions).values({
    channelId: insertedRestrictedChannel!.id,
    roleId: insertedDefaultRole!.id,
    permission: ChannelPermission.VIEW_CHANNEL,
    allow: true,
    createdAt: firstStart
  });

  await db.insert(channelUserPermissions).values({
    channelId: insertedRestrictedChannel!.id,
    userId: insertedUser!.id,
    permission: ChannelPermission.VIEW_CHANNEL,
    allow: false,
    createdAt: firstStart
  });

  if (e2e) {
    const allUsers = [
      insertedOwner!,
      insertedUser!,
      insertedUserA!,
      insertedUserB!
    ];

    // add logins for all users to test login history and last seen related features
    const loginsData = allUsers.map((user) => ({
      userId: user.id,
      timestamp: Date.now(),
      createdAt: Date.now()
    }));

    await db.insert(logins).values(loginsData);

    // for e2e we seed additional data specific to e2e tests, to avoid polluting the unit test database with too much data that is only relevant for e2e tests
    // but keeping the same base mocks that we also use in integration tests to ensure consistency between unit, integration and e2e tests
    await seedE2E(db);
  }

  return {
    settings: initialSettings,
    owner: insertedOwner!,
    user: insertedUser!,
    dmChannel: insertedDmChannel!,
    privateVoiceChannel: insertedPrivateVoiceChannel!,
    restrictedChannel: insertedRestrictedChannel!,
    userA: insertedUserA!,
    userB: insertedUserB!,
    moderator: insertedModerator!,
    ownerRole,
    defaultRole: insertedDefaultRole!,
    moderatorRole: insertedModeratorRole!,
    categories: initialCategories,
    channels: initialChannels,
    originalToken: TEST_SECRET_TOKEN
  };
};

export { seedTestDb, TEST_SECRET_TOKEN };
