import {
  ChannelType,
  DEFAULT_ROLE_PERMISSIONS,
  OWNER_ROLE_ID,
  Permission,
  sha256,
  STORAGE_MAX_FILE_SIZE,
  STORAGE_MIN_QUOTA_PER_USER,
  STORAGE_OVERFLOW_ACTION,
  STORAGE_QUOTA,
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
  messages,
  rolePermissions,
  roles,
  settings,
  userRoles,
  users
} from '../db/schema';

const TEST_SECRET_TOKEN = 'test-secret-token-for-unit-tests';

const hashedPassword = await Bun.password.hash('password123');

const seedDatabase = async (db: BunSQLiteDatabase) => {
  const firstStart = Date.now();

  const initialSettings: TISettings = {
    name: 'Test Server',
    description: 'Test server description',
    password: '',
    serverId: randomUUIDv7(),
    secretToken: await sha256(TEST_SECRET_TOKEN),
    allowNewUsers: true,
    storageUploadEnabled: true,
    storageQuota: STORAGE_QUOTA,
    storageUploadMaxFileSize: STORAGE_MAX_FILE_SIZE,
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
      position: 0,
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

  return {
    settings: initialSettings,
    owner: insertedOwner!,
    user: insertedUser!,
    ownerRole,
    defaultRole: insertedDefaultRole!,
    categories: initialCategories,
    channels: initialChannels,
    originalToken: TEST_SECRET_TOKEN
  };
};

export { seedDatabase, TEST_SECRET_TOKEN };
