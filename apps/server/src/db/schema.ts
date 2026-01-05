import {
  type TActivityLogDetailsMap,
  type TMessageMetadata
} from '@sharkord/shared';
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex
} from 'drizzle-orm/sqlite-core';

const settings = sqliteTable(
  'settings',
  {
    name: text('name').notNull(),
    description: text('description'),
    password: text('password'),
    serverId: text('server_id').notNull(),
    secretToken: text('secret_token'),
    logoId: integer('logo_id').references(() => files.id),
    allowNewUsers: integer('allow_new_users', { mode: 'boolean' }).notNull(),
    storageUploadEnabled: integer('storage_uploads_enabled', {
      mode: 'boolean'
    }).notNull(),
    storageQuota: integer('storage_quota').notNull(),
    storageUploadMaxFileSize: integer('storage_upload_max_file_size').notNull(),
    storageSpaceQuotaByUser: integer('storage_space_quota_by_user').notNull(),
    storageOverflowAction: text('storage_overflow_action').notNull()
  },
  (t) => ({
    serverIdx: index('settings_server_idx').on(t.serverId)
  })
);

const roles = sqliteTable('roles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').notNull().default('#ffffff'),
  isPersistent: integer('is_persistent', { mode: 'boolean' }).notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at')
});

const categories = sqliteTable(
  'categories',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    position: integer('position').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at')
  },
  (t) => ({
    posIdx: index('categories_position_idx').on(t.position)
  })
);

const channels = sqliteTable(
  'channels',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    type: text('type').notNull(),
    name: text('name').notNull(),
    topic: text('topic'),
    private: integer('private', { mode: 'boolean' }).notNull().default(false),
    position: integer('position').notNull(),
    categoryId: integer('category_id').references(() => categories.id, {
      onDelete: 'set null'
    }),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at')
  },
  (t) => ({
    catIdx: index('channels_category_idx').on(t.categoryId),
    posIdx: index('channels_position_idx').on(t.position),
    typeIdx: index('channels_type_idx').on(t.type)
  })
);

const files = sqliteTable(
  'files',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().unique(),
    originalName: text('original_name').notNull(),
    md5: text('md5').notNull(),
    userId: integer('user_id').notNull(),
    size: integer('size').notNull(),
    mimeType: text('mime_type').notNull(),
    extension: text('extension').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at')
  },
  (t) => ({
    userIdx: index('files_user_idx').on(t.userId),
    md5Idx: index('files_md5_idx').on(t.md5),
    createdIdx: index('files_created_idx').on(t.createdAt),
    nameIdx: index('files_name_idx').on(t.name)
  })
);

const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    identity: text('identity').unique().notNull(),
    password: text('password').notNull(),
    name: text('name').notNull(),
    avatarId: integer('avatar_id').references(() => files.id, {
      onDelete: 'set null'
    }),
    bannerId: integer('banner_id').references(() => files.id, {
      onDelete: 'set null'
    }),
    bio: text('bio'),
    banned: integer('banned', { mode: 'boolean' }).notNull().default(false),
    banReason: text('ban_reason'),
    bannedAt: integer('banned_at'),
    bannerColor: text('banner_color'),
    lastLoginAt: integer('last_login_at')
      .notNull()
      .$defaultFn(() => Date.now()),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at')
  },
  (t) => ({
    identityIdx: uniqueIndex('users_identity_idx').on(t.identity),
    nameIdx: index('users_name_idx').on(t.name),
    bannedIdx: index('users_banned_idx').on(t.banned),
    lastLoginIdx: index('users_last_login_idx').on(t.lastLoginAt)
  })
);

const userRoles = sqliteTable(
  'user_roles',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull()
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.roleId] }),
    userIdx: index('user_roles_user_idx').on(t.userId),
    roleIdx: index('user_roles_role_idx').on(t.roleId)
  })
);

const logins = sqliteTable(
  'logins',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    userAgent: text('user_agent'),
    os: text('os'),
    device: text('device'),
    ip: text('ip'),
    hostname: text('hostname'),
    city: text('city'),
    region: text('region'),
    country: text('country'),
    loc: text('loc'),
    org: text('org'),
    postal: text('postal'),
    timezone: text('timezone'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at')
  },
  (t) => ({
    userIdx: index('logins_user_idx').on(t.userId),
    ipIdx: index('logins_ip_idx').on(t.ip),
    createdIdx: index('logins_created_idx').on(t.createdAt),
    userCreatedIdx: index('logins_user_created_idx').on(t.userId, t.createdAt)
  })
);

const messages = sqliteTable(
  'messages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    content: text('content'),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    channelId: integer('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    metadata: text('metadata', { mode: 'json' }).$type<TMessageMetadata[]>(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at')
  },
  (t) => ({
    userIdx: index('messages_user_idx').on(t.userId),
    channelIdx: index('messages_channel_idx').on(t.channelId),
    createdIdx: index('messages_created_idx').on(t.createdAt),
    channelCreatedIdx: index('messages_channel_created_idx').on(
      t.channelId,
      t.createdAt
    )
  })
);

const messageFiles = sqliteTable(
  'message_files',
  {
    messageId: integer('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    fileId: integer('file_id')
      .notNull()
      .references(() => files.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at')
  },
  (t) => ({
    pk: primaryKey({ columns: [t.messageId, t.fileId] }),
    msgIdx: index('message_files_msg_idx').on(t.messageId),
    fileIdx: index('message_files_file_idx').on(t.fileId)
  })
);

const rolePermissions = sqliteTable(
  'role_permissions',
  {
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permission: text('permission').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at')
  },
  (t) => ({
    pk: primaryKey({ columns: [t.roleId, t.permission] }),
    roleIdx: index('role_permissions_role_idx').on(t.roleId),
    permissionIdx: index('role_permissions_permission_idx').on(t.permission)
  })
);

const emojis = sqliteTable(
  'emojis',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().unique(),
    fileId: integer('file_id')
      .notNull()
      .references(() => files.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at')
  },
  (t) => ({
    userIdx: index('emojis_user_idx').on(t.userId),
    fileIdx: index('emojis_file_idx').on(t.fileId),
    nameIdx: uniqueIndex('emojis_name_idx').on(t.name)
  })
);

const notificationSounds = sqliteTable(
  'notification_sounds',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    type: text('type').notNull().unique(),
    fileId: integer('file_id')
      .notNull()
      .references(() => files.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    volume: integer('volume').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at')
  },
  (t) => ({
    typeIdx: uniqueIndex('notification_sounds_type_idx').on(t.type),
    userIdx: index('notification_sounds_user_idx').on(t.userId),
    userTypeIdx: index('notification_sounds_user_type_idx').on(t.userId, t.type)
  })
);

const messageReactions = sqliteTable(
  'message_reactions',
  {
    messageId: integer('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    emoji: text('emoji').notNull(),
    fileId: integer('file_id').references(() => files.id, {
      onDelete: 'set null'
    }),
    createdAt: integer('created_at').notNull()
  },
  (t) => ({
    pk: primaryKey({ columns: [t.messageId, t.userId, t.emoji] }),
    msgIdx: index('reaction_msg_idx').on(t.messageId),
    emojiIdx: index('reaction_emoji_idx').on(t.emoji),
    userIdx: index('reaction_user_idx').on(t.userId),
    msgEmojiIdx: index('reaction_msg_emoji_idx').on(t.messageId, t.emoji)
  })
);

const invites = sqliteTable(
  'invites',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    code: text('code').notNull().unique(),
    creatorId: integer('creator_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    maxUses: integer('max_uses'),
    uses: integer('uses').notNull().default(0),
    expiresAt: integer('expires_at'),
    createdAt: integer('created_at').notNull()
  },
  (t) => ({
    codeIdx: uniqueIndex('invites_code_idx').on(t.code),
    creatorIdx: index('invites_creator_idx').on(t.creatorId),
    expiresIdx: index('invites_expires_idx').on(t.expiresAt),
    usesIdx: index('invites_uses_idx').on(t.uses)
  })
);

const activityLog = sqliteTable(
  'activity_log',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    details: text('details', { mode: 'json' }).$type<
      TActivityLogDetailsMap[keyof TActivityLogDetailsMap]
    >(),
    ip: text('ip'),
    createdAt: integer('created_at').notNull()
  },
  (t) => ({
    userIdx: index('activity_log_user_idx').on(t.userId),
    typeIdx: index('activity_log_type_idx').on(t.type),
    createdIdx: index('activity_log_created_idx').on(t.createdAt),
    userCreatedIdx: index('activity_log_user_created_idx').on(
      t.userId,
      t.createdAt
    ),
    typeCreatedIdx: index('activity_log_type_created_idx').on(
      t.type,
      t.createdAt
    )
  })
);

const channelRolePermissions = sqliteTable(
  'channel_role_permissions',
  {
    channelId: integer('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permission: text('permission').notNull(),
    allow: integer('allow', { mode: 'boolean' }).notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at')
  },
  (t) => ({
    pk: primaryKey({ columns: [t.channelId, t.roleId, t.permission] }),
    channelIdx: index('channel_role_permissions_channel_idx').on(t.channelId),
    roleIdx: index('channel_role_permissions_role_idx').on(t.roleId),
    channelPermIdx: index('channel_role_permissions_channel_perm_idx').on(
      t.channelId,
      t.permission
    ),
    rolePermIdx: index('channel_role_permissions_role_perm_idx').on(
      t.roleId,
      t.permission
    ),
    allowIdx: index('channel_role_permissions_allow_idx').on(t.allow)
  })
);

const channelUserPermissions = sqliteTable(
  'channel_user_permissions',
  {
    channelId: integer('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    permission: text('permission').notNull(),
    allow: integer('allow', { mode: 'boolean' }).notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at')
  },
  (t) => ({
    pk: primaryKey({ columns: [t.channelId, t.userId, t.permission] }),
    channelIdx: index('channel_user_permissions_channel_idx').on(t.channelId),
    userIdx: index('channel_user_permissions_user_idx').on(t.userId),
    channelPermIdx: index('channel_user_permissions_channel_perm_idx').on(
      t.channelId,
      t.permission
    ),
    userPermIdx: index('channel_user_permissions_user_perm_idx').on(
      t.userId,
      t.permission
    ),
    allowIdx: index('channel_user_permissions_allow_idx').on(t.allow)
  })
);

const channelReadStates = sqliteTable(
  'channel_read_states',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    channelId: integer('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    lastReadMessageId: integer('last_read_message_id').references(
      () => messages.id,
      { onDelete: 'set null' }
    ),
    lastReadAt: integer('last_read_at').notNull()
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.channelId] }),
    userIdx: index('channel_read_states_user_idx').on(t.userId),
    channelIdx: index('channel_read_states_channel_idx').on(t.channelId),
    lastReadIdx: index('channel_read_states_last_read_idx').on(
      t.lastReadMessageId
    )
  })
);

export {
  activityLog,
  categories,
  channelReadStates,
  channelRolePermissions,
  channels,
  channelUserPermissions,
  emojis,
  files,
  invites,
  logins,
  messageFiles,
  messageReactions,
  messages,
  notificationSounds,
  rolePermissions,
  roles,
  settings,
  userRoles,
  users
};
