import {
  ChannelType,
  DEFAULT_ROLE_PERMISSIONS,
  OWNER_ROLE_ID,
  Permission,
  sha256,
  STORAGE_DEFAULT_MAX_AVATAR_SIZE,
  STORAGE_DEFAULT_MAX_BANNER_SIZE,
  STORAGE_DEFAULT_MAX_FILES_PER_MESSAGE,
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
  channels,
  directMessages,
  messages,
  rolePermissions,
  roles,
  settings,
  userRoles,
  users
} from '../db/schema';

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
 * Channels:
 * - General (1)
 * - Voice (2)
 * - DM Channel (3) (between User A and User B)
 * Messages:
 * - Test message (1) (in General, by Test Owner)
 * - Hello User B (2) (in DM Channel, by User A)
 */

const seedDatabase = async (db: BunSQLiteDatabase) => {
  const firstStart = Date.now();

  const initialSettings: TISettings = {
    name: 'Test Server',
    description: 'Test server description',
    password: '',
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
    enablePlugins: false
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
      fileAccessToken: randomUUIDv7(),
      fileAccessTokenUpdatedAt: Date.now(),
      categoryId: 1,
      topic: 'General text channel',
      createdAt: firstStart
    },
    {
      type: ChannelType.VOICE,
      name: 'Voice',
      position: 1,
      fileAccessToken: randomUUIDv7(),
      fileAccessTokenUpdatedAt: Date.now(),
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
    bannerColor: null,
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
    bannerColor: null,
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
    bannerColor: null,
    createdAt: firstStart
  };

  const userB: TIUser = {
    name: 'User B',
    identity: 'userb',
    password: hashedPassword,
    avatarId: null,
    bannerId: null,
    bio: null,
    bannerColor: null,
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
    fileAccessToken: randomUUIDv7(),
    fileAccessTokenUpdatedAt: Date.now(),
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

  // TODO: check if this can be passed to the tests

  return {
    settings: initialSettings,
    owner: insertedOwner!,
    user: insertedUser!,
    dmChannel: insertedDmChannel!,
    userA: insertedUserA!,
    userB: insertedUserB!,
    ownerRole,
    defaultRole: insertedDefaultRole!,
    categories: initialCategories,
    channels: initialChannels,
    originalToken: TEST_SECRET_TOKEN
  };
};

export { seedDatabase, TEST_SECRET_TOKEN };
