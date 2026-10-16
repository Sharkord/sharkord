/**
 * Wipes the development data directory and rebuilds it with mock data, so a dev server
 * starts with something that looks like a real community instead of an empty shell.
 *
 *   bun run seed:mock                      medium, deterministic
 *   bun run seed:mock -- --size large      more of everything
 *   bun run seed:mock -- --seed 42         a different cast of characters
 *   bun run seed:mock -- --counting 0      skip the numbered #counting channel
 *
 * Only ever touches apps/server/data, the directory the dev server uses (see
 * helpers/paths.ts). It refuses to run against anything else, which is the whole reason
 * the path is not configurable.
 *
 * Stop the server before running this. Seeding writes settings, so the server's own
 * seedDatabase() finds a settings row on the next boot and no-ops, exactly like the e2e
 * seed in packages/e2e/tests/setup/seed-db.ts.
 */
import { faker } from '@faker-js/faker';
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
  type TICategory,
  type TIChannel,
  type TIRole,
  type TISettings,
  type TIUser
} from '@sharkord/shared';
import { randomUUIDv7 } from 'bun';
import { Database } from 'bun:sqlite';
import { eq } from 'drizzle-orm';
import { drizzle, type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import fs from 'fs/promises';
import path from 'path';
import { migrateDatabase } from '../src/db/migrate';
import {
  categories,
  channelReadStates,
  channelRolePermissions,
  channels,
  directMessages,
  messageReactions,
  messages,
  rolePermissions,
  roles,
  settings,
  userRoles,
  users
} from '../src/db/schema';

const DEV_DATA_PATH = path.resolve(import.meta.dir, '../data');
const MIGRATIONS_PATH = path.resolve(import.meta.dir, '../src/db/migrations');

const MOCK_PASSWORD = 'password123';
const DEV_SECRET_TOKEN = 'dev';
const DEFAULT_SEED = 1337;

// the #counting channel is the same size whatever --size is, since its whole job is being
// long enough to scroll through
const COUNTING_MESSAGES = 10_000;

// one insert per row is unusably slow past a few hundred messages, and sqlite has a hard
// limit on bound parameters, so everything large goes in batches
const BATCH_SIZE = 250;

type TSize = 'small' | 'medium' | 'large';

type TSizeProfile = {
  users: number;
  categories: number;
  textChannels: number;
  voiceChannels: number;
  messages: number;
  days: number;
};

const SIZES: Record<TSize, TSizeProfile> = {
  small: {
    users: 5,
    categories: 2,
    textChannels: 4,
    voiceChannels: 2,
    messages: 60,
    days: 7
  },
  medium: {
    users: 15,
    categories: 4,
    textChannels: 12,
    voiceChannels: 6,
    messages: 3_000,
    days: 45
  },
  large: {
    users: 40,
    categories: 6,
    textChannels: 22,
    voiceChannels: 8,
    messages: 25_000,
    days: 180
  }
};

const REACTION_EMOJIS = ['👍', '😂', '🔥', '❤️', '🎉', '👀', '🤔', '💀'];

const CATEGORY_NAMES = [
  'General',
  'Gaming',
  'Technology',
  'Off Topic',
  'Music',
  'Projects'
];

const TEXT_CHANNEL_NAMES = [
  'general',
  'random',
  'links',
  'help',
  'showcase',
  'gaming',
  'music',
  'movies',
  'food',
  'pets',
  'news',
  'dev',
  'design',
  'books',
  'sports',
  'photos',
  'deals',
  'homelab',
  'cooking',
  'travel',
  'memes',
  'announcements'
];

const VOICE_CHANNEL_NAMES = [
  'Lounge',
  'Gaming 1',
  'Gaming 2',
  'Music',
  'AFK',
  'Meeting',
  'Late Night',
  'Study'
];

const parseArgs = () => {
  const args = process.argv.slice(2);
  const getFlag = (name: string) => {
    const index = args.indexOf(`--${name}`);

    return index === -1 ? undefined : args[index + 1];
  };

  const size = (getFlag('size') ?? 'medium') as TSize;

  if (!(size in SIZES)) {
    throw new Error(
      `Unknown --size '${size}'. Use one of: ${Object.keys(SIZES).join(', ')}`
    );
  }

  const rawSeed = getFlag('seed');
  const seed = rawSeed === undefined ? DEFAULT_SEED : Number(rawSeed);

  if (!Number.isFinite(seed)) {
    throw new Error(`--seed must be a number, received '${rawSeed}'`);
  }

  const rawCounting = getFlag('counting');

  const counting =
    rawCounting === undefined ? COUNTING_MESSAGES : Number(rawCounting);

  if (!Number.isInteger(counting) || counting < 0) {
    throw new Error(
      `--counting must be a whole number (0 skips the channel), received '${rawCounting}'`
    );
  }

  return { size, seed, counting };
};

// the guard that makes the hard-coded path meaningful: if this file is ever moved, the
// resolved path stops ending in apps/server/data and the script refuses rather than
// deleting whatever it landed on
const assertDevDataPath = () => {
  const expectedSuffix = path.join('apps', 'server', 'data');

  if (!DEV_DATA_PATH.endsWith(expectedSuffix)) {
    throw new Error(
      `Refusing to wipe '${DEV_DATA_PATH}': it is not the dev data directory.`
    );
  }
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const paragraph = (text: string) =>
  `<p>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;

const chatLine = () => {
  const roll = faker.number.int({ min: 1, max: 100 });

  if (roll <= 45) return faker.lorem.sentence({ min: 3, max: 12 });
  if (roll <= 65) return faker.hacker.phrase();
  if (roll <= 75) return faker.word.interjection();
  if (roll <= 85) return faker.lorem.sentences({ min: 2, max: 3 });
  if (roll <= 92) return faker.company.catchPhrase();
  if (roll <= 97) return faker.internet.url();

  return faker.lorem.paragraph();
};

const seedSettings = async (db: BunSQLiteDatabase) => {
  const initialSettings: TISettings = {
    name: 'Sharkord Dev',
    description: 'Local development server, full of imaginary people.',
    password: '',
    onlyAskForPasswordOnFirstJoin: false,
    serverId: randomUUIDv7(),
    secretToken: await sha256(DEV_SECRET_TOKEN),
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
    // a dev server that asks you to set up a profile on every wipe gets old fast
    showWelcomeDialog: false,
    storageSignedUrlsEnabled: false,
    storageSignedUrlsTtlSeconds: STORAGE_DEFAULT_SIGNED_URLS_TTL_SECONDS,
    storageImageOptimizationEnabled: false,
    storageImageOptimizationQuality: STORAGE_DEFAULT_IMAGE_OPTIMIZATION_QUALITY
  };

  await db.insert(settings).values(initialSettings);
};

const seedRoles = async (db: BunSQLiteDatabase, now: number) => {
  const ownerRole: TIRole = {
    id: OWNER_ROLE_ID,
    name: 'Owner',
    color: '#e11d48',
    isPersistent: true,
    isDefault: false,
    storageQuotaOverrideEnabled: false,
    storageSpaceQuota: 0,
    createdAt: now
  };

  const memberRole: TIRole = {
    name: 'Member',
    color: '#99aab5',
    isPersistent: true,
    isDefault: true,
    storageQuotaOverrideEnabled: false,
    storageSpaceQuota: 0,
    createdAt: now
  };

  const moderatorRole: TIRole = {
    name: 'Moderator',
    color: '#3b82f6',
    isPersistent: false,
    isDefault: false,
    storageQuotaOverrideEnabled: true,
    storageSpaceQuota: 5 * 1024 * 1024 * 1024,
    createdAt: now
  };

  await db.insert(roles).values(ownerRole);

  const [member] = await db.insert(roles).values(memberRole).returning();
  const [moderator] = await db.insert(roles).values(moderatorRole).returning();

  await db.insert(rolePermissions).values([
    ...Object.values(Permission).map((permission) => ({
      roleId: OWNER_ROLE_ID,
      permission,
      createdAt: now
    })),
    ...DEFAULT_ROLE_PERMISSIONS.map((permission) => ({
      roleId: member!.id,
      permission,
      createdAt: now
    })),
    ...[
      ...DEFAULT_ROLE_PERMISSIONS,
      Permission.MANAGE_MESSAGES,
      Permission.MANAGE_USERS,
      Permission.MOVE_MEMBERS,
      Permission.PIN_MESSAGES
    ].map((permission) => ({
      roleId: moderator!.id,
      permission,
      createdAt: now
    }))
  ]);

  return { memberRoleId: member!.id, moderatorRoleId: moderator!.id };
};

const seedUsers = async (
  db: BunSQLiteDatabase,
  now: number,
  profile: TSizeProfile,
  roleIds: { memberRoleId: number; moderatorRoleId: number }
) => {
  const password = await Bun.password.hash(MOCK_PASSWORD);
  const takenIdentities = new Set<string>();

  const uniqueIdentity = (name: string) => {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 14) || 'user';

    let identity = base;
    let suffix = 1;

    while (takenIdentities.has(identity)) {
      identity = `${base}${++suffix}`;
    }

    takenIdentities.add(identity);

    return identity;
  };

  const owner: TIUser = {
    name: 'Admin',
    identity: uniqueIdentity('admin'),
    password,
    avatarId: null,
    bannerId: null,
    bio: 'The one who pays for the server.',
    createdAt: now - profile.days * 86_400_000
  };

  const [insertedOwner] = await db.insert(users).values(owner).returning();

  const mockUsers: TIUser[] = Array.from({ length: profile.users - 1 }, () => {
    const name = faker.internet.username().replace(/[._]/g, '');

    return {
      name,
      identity: uniqueIdentity(name),
      password,
      avatarId: null,
      bannerId: null,
      bio:
        faker.helpers.maybe(() => faker.person.bio(), { probability: 0.6 }) ??
        null,
      profileColor: faker.color.rgb(),
      createdAt:
        now - faker.number.int({ min: 1, max: profile.days }) * 86_400_000,
      // spread the "last seen" out so the member list is not uniformly fresh
      lastLoginAt: now - faker.number.int({ min: 0, max: 14 }) * 86_400_000
    } satisfies TIUser;
  });

  const insertedUsers = [];

  for (const batch of chunk(mockUsers, BATCH_SIZE)) {
    insertedUsers.push(...(await db.insert(users).values(batch).returning()));
  }

  const moderators = insertedUsers.slice(
    0,
    Math.max(1, Math.floor(insertedUsers.length / 6))
  );

  await db.insert(userRoles).values([
    { userId: insertedOwner!.id, roleId: OWNER_ROLE_ID, createdAt: now },
    ...insertedUsers.map((user) => ({
      userId: user.id,
      roleId: roleIds.memberRoleId,
      createdAt: now
    })),
    ...moderators.map((user) => ({
      userId: user.id,
      roleId: roleIds.moderatorRoleId,
      createdAt: now
    }))
  ]);

  return {
    ownerId: insertedOwner!.id,
    userIds: [insertedOwner!.id, ...insertedUsers.map((user) => user.id)]
  };
};

const seedChannels = async (
  db: BunSQLiteDatabase,
  now: number,
  profile: TSizeProfile,
  moderatorRoleId: number
) => {
  const categoryNames = CATEGORY_NAMES.slice(0, profile.categories);

  const insertedCategories = await db
    .insert(categories)
    .values(
      categoryNames.map(
        (name, index): TICategory => ({
          name,
          position: index,
          createdAt: now
        })
      )
    )
    .returning();

  const textNames = faker.helpers
    .shuffle([...TEXT_CHANNEL_NAMES])
    .slice(0, profile.textChannels);

  const voiceNames = faker.helpers
    .shuffle([...VOICE_CHANNEL_NAMES])
    .slice(0, profile.voiceChannels);

  const rows: TIChannel[] = [
    ...textNames.map(
      (name, index): TIChannel => ({
        type: ChannelType.TEXT,
        name,
        topic: faker.company.catchPhrase(),
        position: index,
        categoryId: insertedCategories[index % insertedCategories.length]!.id,
        createdAt: now
      })
    ),
    ...voiceNames.map(
      (name, index): TIChannel => ({
        type: ChannelType.VOICE,
        name,
        topic: null,
        position: textNames.length + index,
        categoryId: insertedCategories[index % insertedCategories.length]!.id,
        createdAt: now
      })
    ),
    // one private channel so channel permissions have something to show
    {
      type: ChannelType.TEXT,
      name: 'mods-only',
      topic: 'Private, moderators can see it',
      private: true,
      position: textNames.length + voiceNames.length,
      categoryId: insertedCategories[0]!.id,
      createdAt: now
    }
  ];

  const insertedChannels = await db.insert(channels).values(rows).returning();
  const privateChannel = insertedChannels.at(-1)!;

  await db.insert(channelRolePermissions).values(
    [
      ChannelPermission.VIEW_CHANNEL,
      ChannelPermission.SEND_MESSAGES,
      ChannelPermission.JOIN,
      ChannelPermission.SPEAK
    ].map((permission) => ({
      channelId: privateChannel.id,
      roleId: moderatorRoleId,
      permission,
      allow: true,
      createdAt: now
    }))
  );

  return {
    textChannelIds: insertedChannels
      .filter((channel) => channel.type === ChannelType.TEXT)
      .map((channel) => channel.id),
    allChannels: insertedChannels,
    firstCategoryId: insertedCategories[0]!.id,
    nextPosition: rows.length
  };
};

/**
 * A channel of nothing but numbered messages, 0 upwards, for testing scrolling, pagination
 * and jump-to-message: whatever is on screen tells you exactly where you are.
 *
 * Authors and timestamps are arranged to exercise the grouping rule in the client
 * (features/server/messages/hooks.ts): consecutive messages by the same author less than a
 * minute apart are drawn as one group, anything else starts a new one. So runs of the same
 * user seconds apart render grouped, and the switches and longer gaps render individually.
 */
const seedCountingChannel = async (
  db: BunSQLiteDatabase,
  now: number,
  count: number,
  userIds: number[],
  categoryId: number,
  position: number
) => {
  const [channel] = await db
    .insert(channels)
    .values({
      type: ChannelType.TEXT,
      name: 'counting',
      topic: `${count.toLocaleString('en-US')} numbered messages, for scroll testing`,
      position,
      categoryId,
      createdAt: now
    })
    .returning();

  const rows: {
    channelId: number;
    userId: number;
    content: string;
    metadata: null;
    createdAt: number;
  }[] = [];

  let timestamp = now;
  let author = faker.helpers.arrayElement(userIds);
  let runLength = 0;

  // built backwards from now so the newest message is the highest number and lands at the
  // bottom of the channel, then reversed before inserting
  for (let index = count - 1; index >= 0; index--) {
    if (runLength === 0) {
      // a run is either one message on its own or a handful from the same person
      runLength = faker.datatype.boolean(0.45)
        ? 1
        : faker.number.int({ min: 2, max: 8 });

      author = faker.helpers.arrayElement(userIds);

      // gap between groups: usually minutes, occasionally long enough to split the days up
      timestamp -= faker.datatype.boolean(0.04)
        ? faker.number.int({ min: 4, max: 20 }) * 3_600_000
        : faker.number.int({ min: 61, max: 900 }) * 1_000;
    } else {
      // inside a run, always under the one minute the client groups by
      timestamp -= faker.number.int({ min: 3, max: 45 }) * 1_000;
    }

    runLength--;

    rows.push({
      channelId: channel!.id,
      userId: author,
      content: `<p>${index}</p>`,
      metadata: null,
      createdAt: timestamp
    });
  }

  rows.reverse();

  for (const batch of chunk(rows, BATCH_SIZE)) {
    await db.insert(messages).values(batch);
  }

  return { channelId: channel!.id, count: rows.length };
};

const seedMessages = async (
  db: BunSQLiteDatabase,
  now: number,
  profile: TSizeProfile,
  channelIds: number[],
  userIds: number[]
) => {
  const windowMs = profile.days * 86_400_000;
  const perChannel = Math.max(
    1,
    Math.round(profile.messages / channelIds.length)
  );

  let total = 0;

  for (const channelId of channelIds) {
    const channelMessageIds: number[] = [];

    const timestamps = Array.from({ length: perChannel }, () =>
      faker.number.int({ min: now - windowMs, max: now })
    ).sort((a, b) => a - b);

    for (const batch of chunk(timestamps, BATCH_SIZE)) {
      const rows = batch.map((createdAt) => {
        const pinned = faker.number.int({ min: 1, max: 200 }) === 1;

        return {
          channelId,
          userId: faker.helpers.arrayElement(userIds),
          content: paragraph(chatLine()),
          metadata: null,
          pinned,
          pinnedAt: pinned ? createdAt : null,
          createdAt
        };
      });

      const inserted = await db
        .insert(messages)
        .values(rows)
        .returning({ id: messages.id });

      channelMessageIds.push(...inserted.map((row) => row.id));

      total += inserted.length;
    }

    // replies and threads are linked afterwards rather than during the insert: a row can
    // only point at a message that already has an id, and ids only exist once the batch
    // has been written
    const links: {
      id: number;
      replyToMessageId?: number;
      parentMessageId?: number;
    }[] = [];
    const threadReplies = new Set<number>();

    for (let index = 1; index < channelMessageIds.length; index++) {
      const roll = faker.number.int({ min: 1, max: 100 });

      if (roll > 26) continue;

      // point at something recent, so conversations look local rather than random
      const targetIndex = faker.number.int({
        min: Math.max(0, index - 40),
        max: index - 1
      });

      const targetId = channelMessageIds[targetIndex]!;
      const id = channelMessageIds[index]!;

      if (roll <= 18) {
        links.push({ id, replyToMessageId: targetId });
        continue;
      }

      // threads are one level deep, the same rule the server enforces on plugin messages
      if (threadReplies.has(targetId)) continue;

      links.push({ id, parentMessageId: targetId });
      threadReplies.add(id);
    }

    if (links.length > 0) {
      db.transaction((tx) => {
        for (const link of links) {
          tx.update(messages)
            .set({
              replyToMessageId: link.replyToMessageId ?? null,
              parentMessageId: link.parentMessageId ?? null
            })
            .where(eq(messages.id, link.id))
            .run();
        }
      });
    }

    // reactions on a slice of the channel, deduplicated by the (message, user, emoji) key
    const reactionTargets = faker.helpers.arrayElements(
      channelMessageIds,
      Math.ceil(channelMessageIds.length * 0.15)
    );

    const reactionRows = reactionTargets.flatMap((messageId) =>
      faker.helpers
        .arrayElements(userIds, faker.number.int({ min: 1, max: 4 }))
        .map((userId) => ({
          messageId,
          userId,
          emoji: faker.helpers.arrayElement(REACTION_EMOJIS),
          createdAt: now
        }))
        .filter(
          (row, index, all) =>
            all.findIndex(
              (other) =>
                other.userId === row.userId && other.emoji === row.emoji
            ) === index
        )
    );

    for (const batch of chunk(reactionRows, BATCH_SIZE)) {
      await db.insert(messageReactions).values(batch).onConflictDoNothing();
    }
  }

  return total;
};

const seedDirectMessages = async (
  db: BunSQLiteDatabase,
  now: number,
  ownerId: number,
  userIds: number[]
) => {
  const partners = userIds.filter((id) => id !== ownerId).slice(0, 3);

  for (const [index, partnerId] of partners.entries()) {
    const [channel] = await db
      .insert(channels)
      .values({
        // voice, matching routers/dms/open-direct-message.ts, which leaves room for calls
        type: ChannelType.VOICE,
        name: `dm-${ownerId}-${partnerId}`,
        topic: null,
        isDm: true,
        private: true,
        position: index,
        categoryId: null,
        createdAt: now
      })
      .returning();

    await db.insert(directMessages).values({
      channelId: channel!.id,
      userOneId: ownerId,
      userTwoId: partnerId,
      createdAt: now
    });

    await db.insert(messages).values(
      Array.from(
        { length: faker.number.int({ min: 4, max: 20 }) },
        (_, position) => ({
          channelId: channel!.id,
          userId: faker.helpers.arrayElement([ownerId, partnerId]),
          content: paragraph(chatLine()),
          metadata: null,
          createdAt: now - (20 - position) * 3_600_000
        })
      )
    );
  }

  return partners.length;
};

// mark the older half of each channel as read for the owner, so the sidebar shows a mix of
// read and unread rather than everything screaming for attention
const seedReadStates = async (
  db: BunSQLiteDatabase,
  now: number,
  ownerId: number,
  channelIds: number[]
) => {
  const rows = [];

  for (const channelId of channelIds) {
    const channelMessages = await db
      .select({ id: messages.id })
      .from(messages)
      .where(eq(messages.channelId, channelId))
      .orderBy(messages.id);

    if (channelMessages.length === 0) continue;

    const marker = channelMessages[Math.floor(channelMessages.length / 2)]!;

    rows.push({
      userId: ownerId,
      channelId,
      lastReadMessageId: marker.id,
      lastReadAt: now
    });
  }

  if (rows.length > 0) await db.insert(channelReadStates).values(rows);
};

const run = async () => {
  const { size, seed, counting } = parseArgs();
  const profile = SIZES[size];

  assertDevDataPath();
  faker.seed(seed);

  const startedAt = Date.now();

  console.log(`Wiping ${DEV_DATA_PATH}`);

  await fs.rm(DEV_DATA_PATH, { recursive: true, force: true });
  await fs.mkdir(DEV_DATA_PATH, { recursive: true });

  const sqlite = new Database(path.join(DEV_DATA_PATH, 'db.sqlite'), {
    create: true,
    strict: true
  });

  const db = drizzle({ client: sqlite });

  await migrateDatabase(sqlite, db, MIGRATIONS_PATH);

  const now = Date.now();

  await seedSettings(db);

  const roleIds = await seedRoles(db, now);
  const { ownerId, userIds } = await seedUsers(db, now, profile, roleIds);

  const { textChannelIds, allChannels, firstCategoryId, nextPosition } =
    await seedChannels(db, now, profile, roleIds.moderatorRoleId);

  const messageCount = await seedMessages(
    db,
    now,
    profile,
    textChannelIds,
    userIds
  );
  const dmCount = await seedDirectMessages(db, now, ownerId, userIds);

  const countingChannel =
    counting > 0
      ? await seedCountingChannel(
          db,
          now,
          counting,
          userIds,
          firstCategoryId,
          nextPosition
        )
      : undefined;

  await seedReadStates(db, now, ownerId, [
    ...textChannelIds,
    ...(countingChannel ? [countingChannel.channelId] : [])
  ]);

  sqlite.close();

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log(
    [
      '',
      `Seeded a ${size} server in ${seconds}s`,
      '',
      `  users      ${userIds.length}`,
      `  channels   ${allChannels.length + (countingChannel ? 1 : 0)} (${textChannelIds.length} text)`,
      `  messages   ${messageCount}`,
      `  dms        ${dmCount}`,
      ...(countingChannel
        ? [`  #counting  ${countingChannel.count} numbered messages`]
        : []),
      '',
      '  log in as  admin',
      `  password   ${MOCK_PASSWORD}`,
      `  every mock user shares that password`,
      '',
      `  owner token: ${DEV_SECRET_TOKEN} (useToken("${DEV_SECRET_TOKEN}") in the console)`,
      ''
    ].join('\n')
  );
};

await run();
