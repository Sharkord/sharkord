import { describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import {
  activityLog,
  categories,
  channelReadStates,
  channelRolePermissions,
  channels,
  channelUserPermissions,
  directMessages,
  emojis,
  files,
  invites,
  logins,
  messageFiles,
  messageReactions,
  messages,
  rolePermissions,
  roles,
  userRoles,
  users
} from '../db/schema';
import { tdb } from './setup';

describe('database cascades', async () => {
  test('initial data is seeded correctly', async () => {
    const messageRows = await tdb.select().from(messages);
    const channelRows = await tdb.select().from(channels);
    const categoriesRows = await tdb.select().from(categories);
    const userRows = await tdb.select().from(users);
    const roleRows = await tdb.select().from(roles);

    expect(messageRows.length).toBeGreaterThan(0);
    expect(channelRows.length).toBeGreaterThan(0);
    expect(categoriesRows.length).toBeGreaterThan(0);
    expect(userRows.length).toBeGreaterThan(0);
    expect(roleRows.length).toBeGreaterThan(0);
  });

  test('deleting a channel cascades to messages', async () => {
    const channelsBefore = await tdb.select().from(channels);
    const messagesBefore = await tdb.select().from(messages);

    expect(messagesBefore.length).toBeGreaterThan(0);

    await tdb.delete(channels).where(eq(channels.id, channelsBefore[0]!.id));

    const messagesAfter = await tdb.select().from(messages);
    expect(messagesAfter.length).toBe(1); // only the DM message from setup should remain
  });

  test('deleting a category cascades to channels and messages', async () => {
    const categoriesBefore = await tdb.select().from(categories);
    const channelsBefore = await tdb.select().from(channels);

    const channelsInCategory = channelsBefore.filter(
      (ch) => ch.categoryId === categoriesBefore[0]!.id
    );

    await tdb
      .delete(categories)
      .where(eq(categories.id, categoriesBefore[0]!.id));

    const channelsAfter = await tdb.select().from(channels);
    expect(channelsAfter.length).toBe(
      channelsBefore.length - channelsInCategory.length
    );

    const messagesAfter = await tdb.select().from(messages);
    expect(messagesAfter.length).toBe(1); // only the DM message from setup should remain
  });

  test('deleting a user cascades to messages, logins, invites, activity logs', async () => {
    const usersBefore = await tdb.select().from(users);
    const userId = usersBefore[0]!.id;

    await tdb.insert(logins).values({
      userId,
      ip: '127.0.0.1',
      createdAt: Date.now()
    });

    await tdb.insert(invites).values({
      code: 'TEST123',
      creatorId: userId,
      createdAt: Date.now()
    });

    await tdb.insert(activityLog).values({
      userId,
      type: 'TEST',
      createdAt: Date.now()
    });

    const loginsBefore = await tdb.select().from(logins);
    const invitesBefore = await tdb.select().from(invites);
    const activityLogBefore = await tdb.select().from(activityLog);

    expect(loginsBefore.length).toBeGreaterThan(0);
    expect(invitesBefore.length).toBeGreaterThan(0);
    expect(activityLogBefore.length).toBeGreaterThan(0);

    await tdb.delete(users).where(eq(users.id, userId));

    const loginsAfter = await tdb.select().from(logins);
    const invitesAfter = await tdb.select().from(invites);
    const activityLogAfter = await tdb.select().from(activityLog);
    const messagesAfter = await tdb.select().from(messages);

    expect(loginsAfter.length).toBe(0);
    expect(invitesAfter.length).toBe(0);
    expect(activityLogAfter.length).toBe(0);
    expect(messagesAfter.length).toBe(1); // only the DM message from setup should remain
  });

  test('deleting a user cascades to user_roles', async () => {
    const usersBefore = await tdb.select().from(users);
    const userId = usersBefore[0]!.id;

    const userRolesBefore = await tdb
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, userId));

    expect(userRolesBefore.length).toBeGreaterThan(0);

    await tdb.delete(users).where(eq(users.id, userId));

    const userRolesAfter = await tdb
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, userId));

    expect(userRolesAfter.length).toBe(0);
  });

  test('deleting a role cascades to user_roles and role_permissions', async () => {
    const rolesBefore = await tdb.select().from(roles);
    const roleId = rolesBefore[0]!.id;

    const rolePermissionsBefore = await tdb
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));

    const userRolesBefore = await tdb
      .select()
      .from(userRoles)
      .where(eq(userRoles.roleId, roleId));

    expect(rolePermissionsBefore.length).toBeGreaterThan(0);
    expect(userRolesBefore.length).toBeGreaterThan(0);

    await tdb.delete(roles).where(eq(roles.id, roleId));

    const rolePermissionsAfter = await tdb
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));

    const userRolesAfter = await tdb
      .select()
      .from(userRoles)
      .where(eq(userRoles.roleId, roleId));

    expect(rolePermissionsAfter.length).toBe(0);
    expect(userRolesAfter.length).toBe(0);
  });

  test('deleting a role cascades to channel_role_permissions', async () => {
    const rolesBefore = await tdb.select().from(roles);
    const channelsBefore = await tdb.select().from(channels);
    const roleId = rolesBefore[0]!.id;
    const channelId = channelsBefore[0]!.id;

    await tdb.insert(channelRolePermissions).values({
      channelId,
      roleId,
      permission: 'TEST_PERMISSION',
      allow: true,
      createdAt: Date.now()
    });

    const channelRolePermsBefore = await tdb
      .select()
      .from(channelRolePermissions)
      .where(eq(channelRolePermissions.roleId, roleId));

    expect(channelRolePermsBefore.length).toBeGreaterThan(0);

    await tdb.delete(roles).where(eq(roles.id, roleId));

    const channelRolePermsAfter = await tdb
      .select()
      .from(channelRolePermissions)
      .where(eq(channelRolePermissions.roleId, roleId));

    expect(channelRolePermsAfter.length).toBe(0);
  });

  test('deleting a channel cascades to channel_role_permissions and channel_user_permissions', async () => {
    const channelsBefore = await tdb.select().from(channels);
    const rolesBefore = await tdb.select().from(roles);
    const usersBefore = await tdb.select().from(users);
    const channelId = channelsBefore[0]!.id;

    await tdb.insert(channelRolePermissions).values({
      channelId,
      roleId: rolesBefore[0]!.id,
      permission: 'TEST_PERMISSION',
      allow: true,
      createdAt: Date.now()
    });

    await tdb.insert(channelUserPermissions).values({
      channelId,
      userId: usersBefore[0]!.id,
      permission: 'TEST_PERMISSION',
      allow: true,
      createdAt: Date.now()
    });

    const channelRolePermsBefore = await tdb
      .select()
      .from(channelRolePermissions)
      .where(eq(channelRolePermissions.channelId, channelId));

    const channelUserPermsBefore = await tdb
      .select()
      .from(channelUserPermissions)
      .where(eq(channelUserPermissions.channelId, channelId));

    expect(channelRolePermsBefore.length).toBeGreaterThan(0);
    expect(channelUserPermsBefore.length).toBeGreaterThan(0);

    await tdb.delete(channels).where(eq(channels.id, channelId));

    const channelRolePermsAfter = await tdb
      .select()
      .from(channelRolePermissions)
      .where(eq(channelRolePermissions.channelId, channelId));

    const channelUserPermsAfter = await tdb
      .select()
      .from(channelUserPermissions)
      .where(eq(channelUserPermissions.channelId, channelId));

    expect(channelRolePermsAfter.length).toBe(0);
    expect(channelUserPermsAfter.length).toBe(0);
  });

  test('deleting a channel cascades to channel_read_states', async () => {
    const channelsBefore = await tdb.select().from(channels);
    const usersBefore = await tdb.select().from(users);
    const channelId = channelsBefore[0]!.id;
    const userId = usersBefore[0]!.id;

    await tdb.insert(channelReadStates).values({
      channelId,
      userId,
      lastReadAt: Date.now()
    });

    const readStatesBefore = await tdb
      .select()
      .from(channelReadStates)
      .where(eq(channelReadStates.channelId, channelId));

    expect(readStatesBefore.length).toBeGreaterThan(0);

    await tdb.delete(channels).where(eq(channels.id, channelId));

    const readStatesAfter = await tdb
      .select()
      .from(channelReadStates)
      .where(eq(channelReadStates.channelId, channelId));

    expect(readStatesAfter.length).toBe(0);
  });

  test('deleting a user cascades to channel_read_states and channel_user_permissions', async () => {
    const usersBefore = await tdb.select().from(users);
    const channelsBefore = await tdb.select().from(channels);
    const userId = usersBefore[0]!.id;

    await tdb.insert(channelReadStates).values({
      channelId: channelsBefore[0]!.id,
      userId,
      lastReadAt: Date.now()
    });

    await tdb.insert(channelUserPermissions).values({
      channelId: channelsBefore[0]!.id,
      userId,
      permission: 'TEST_PERMISSION',
      allow: true,
      createdAt: Date.now()
    });

    const readStatesBefore = await tdb
      .select()
      .from(channelReadStates)
      .where(eq(channelReadStates.userId, userId));

    const channelUserPermsBefore = await tdb
      .select()
      .from(channelUserPermissions)
      .where(eq(channelUserPermissions.userId, userId));

    expect(readStatesBefore.length).toBeGreaterThan(0);
    expect(channelUserPermsBefore.length).toBeGreaterThan(0);

    await tdb.delete(users).where(eq(users.id, userId));

    const readStatesAfter = await tdb
      .select()
      .from(channelReadStates)
      .where(eq(channelReadStates.userId, userId));

    const channelUserPermsAfter = await tdb
      .select()
      .from(channelUserPermissions)
      .where(eq(channelUserPermissions.userId, userId));

    expect(readStatesAfter.length).toBe(0);
    expect(channelUserPermsAfter.length).toBe(0);
  });

  test('deleting a message cascades to message_files and message_reactions', async () => {
    const messagesBefore = await tdb.select().from(messages);
    const usersBefore = await tdb.select().from(users);
    const messageId = messagesBefore[0]!.id;

    const [file] = await tdb
      .insert(files)
      .values({
        name: 'test.txt',
        originalName: 'test.txt',
        md5: 'test123',
        userId: usersBefore[0]!.id,
        size: 100,
        mimeType: 'text/plain',
        extension: 'txt',
        createdAt: Date.now()
      })
      .returning();

    await tdb.insert(messageFiles).values({
      messageId,
      fileId: file!.id,
      createdAt: Date.now()
    });

    await tdb.insert(messageReactions).values({
      messageId,
      userId: usersBefore[0]!.id,
      emoji: '👍',
      createdAt: Date.now()
    });

    const messageFilesBefore = await tdb
      .select()
      .from(messageFiles)
      .where(eq(messageFiles.messageId, messageId));

    const messageReactionsBefore = await tdb
      .select()
      .from(messageReactions)
      .where(eq(messageReactions.messageId, messageId));

    expect(messageFilesBefore.length).toBeGreaterThan(0);
    expect(messageReactionsBefore.length).toBeGreaterThan(0);

    await tdb.delete(messages).where(eq(messages.id, messageId));

    const messageFilesAfter = await tdb
      .select()
      .from(messageFiles)
      .where(eq(messageFiles.messageId, messageId));

    const messageReactionsAfter = await tdb
      .select()
      .from(messageReactions)
      .where(eq(messageReactions.messageId, messageId));

    expect(messageFilesAfter.length).toBe(0);
    expect(messageReactionsAfter.length).toBe(0);
  });

  test('deleting a file cascades to message_files and emojis', async () => {
    const usersBefore = await tdb.select().from(users);
    const messagesBefore = await tdb.select().from(messages);

    const [file] = await tdb
      .insert(files)
      .values({
        name: 'test2.txt',
        originalName: 'test2.txt',
        md5: 'test456',
        userId: usersBefore[0]!.id,
        size: 100,
        mimeType: 'text/plain',
        extension: 'txt',
        createdAt: Date.now()
      })
      .returning();

    await tdb.insert(messageFiles).values({
      messageId: messagesBefore[0]!.id,
      fileId: file!.id,
      createdAt: Date.now()
    });

    await tdb.insert(emojis).values({
      name: 'test_emoji',
      fileId: file!.id,
      userId: usersBefore[0]!.id,
      createdAt: Date.now()
    });

    const messageFilesBefore = await tdb
      .select()
      .from(messageFiles)
      .where(eq(messageFiles.fileId, file!.id));

    const emojisBefore = await tdb
      .select()
      .from(emojis)
      .where(eq(emojis.fileId, file!.id));

    expect(messageFilesBefore.length).toBeGreaterThan(0);
    expect(emojisBefore.length).toBeGreaterThan(0);

    await tdb.delete(files).where(eq(files.id, file!.id));

    const messageFilesAfter = await tdb
      .select()
      .from(messageFiles)
      .where(eq(messageFiles.fileId, file!.id));

    const emojisAfter = await tdb
      .select()
      .from(emojis)
      .where(eq(emojis.fileId, file!.id));

    expect(messageFilesAfter.length).toBe(0);
    expect(emojisAfter.length).toBe(0);
  });

  test('deleting a user cascades to emojis and message_reactions', async () => {
    const usersBefore = await tdb.select().from(users);
    const messagesBefore = await tdb.select().from(messages);
    const userId = usersBefore[0]!.id;

    const [file] = await tdb
      .insert(files)
      .values({
        name: 'emoji.png',
        originalName: 'emoji.png',
        md5: 'emoji123',
        userId,
        size: 100,
        mimeType: 'image/png',
        extension: 'png',
        createdAt: Date.now()
      })
      .returning();

    await tdb.insert(emojis).values({
      name: 'user_emoji',
      fileId: file!.id,
      userId,
      createdAt: Date.now()
    });

    await tdb.insert(messageReactions).values({
      messageId: messagesBefore[0]!.id,
      userId,
      emoji: '🔥',
      createdAt: Date.now()
    });

    const emojisBefore = await tdb
      .select()
      .from(emojis)
      .where(eq(emojis.userId, userId));

    const messageReactionsBefore = await tdb
      .select()
      .from(messageReactions)
      .where(eq(messageReactions.userId, userId));

    expect(emojisBefore.length).toBeGreaterThan(0);
    expect(messageReactionsBefore.length).toBeGreaterThan(0);

    await tdb.delete(users).where(eq(users.id, userId));

    const emojisAfter = await tdb
      .select()
      .from(emojis)
      .where(eq(emojis.userId, userId));

    const messageReactionsAfter = await tdb
      .select()
      .from(messageReactions)
      .where(eq(messageReactions.userId, userId));

    expect(emojisAfter.length).toBe(0);
    expect(messageReactionsAfter.length).toBe(0);
  });

  test('deleting a channel cascades to direct_messages', async () => {
    const usersBefore = await tdb.select().from(users);
    const categoriesBefore = await tdb.select().from(categories);

    let userOneId = usersBefore[0]?.id;
    let userTwoId = usersBefore[1]?.id;

    if (!userOneId) {
      const [u1] = await tdb
        .insert(users)
        .values({
          name: 'DM User One',
          identity: 'dmuser1',
          password: 'hash',
          avatarId: null,
          bannerId: null,
          bio: null,
          bannerColor: null,
          createdAt: Date.now()
        })
        .returning();
      userOneId = u1!.id;
    }

    if (!userTwoId) {
      const [u2] = await tdb
        .insert(users)
        .values({
          name: 'DM User Two',
          identity: 'dmuser2',
          password: 'hash',
          avatarId: null,
          bannerId: null,
          bio: null,
          bannerColor: null,
          createdAt: Date.now()
        })
        .returning();
      userTwoId = u2!.id;
    }

    let categoryId = categoriesBefore[0]?.id;

    if (!categoryId) {
      const [cat] = await tdb
        .insert(categories)
        .values({ name: 'DM Category', position: 1, createdAt: Date.now() })
        .returning();
      categoryId = cat!.id;
    }

    const [dmChannel] = await tdb
      .insert(channels)
      .values({
        type: 'TEXT',
        name: 'dm-channel',
        position: 0,
        fileAccessToken: 'dm-token-1',
        fileAccessTokenUpdatedAt: Date.now(),
        categoryId,
        isDm: true,
        createdAt: Date.now()
      })
      .returning();

    await tdb.insert(directMessages).values({
      channelId: dmChannel!.id,
      userOneId,
      userTwoId,
      createdAt: Date.now()
    });

    const dmsBefore = await tdb
      .select()
      .from(directMessages)
      .where(eq(directMessages.channelId, dmChannel!.id));

    expect(dmsBefore.length).toBe(1);

    await tdb.delete(channels).where(eq(channels.id, dmChannel!.id));

    const dmsAfter = await tdb
      .select()
      .from(directMessages)
      .where(eq(directMessages.channelId, dmChannel!.id));

    expect(dmsAfter.length).toBe(0);
  });

  test('deleting userOne cascades to direct_messages', async () => {
    const categoriesBefore = await tdb.select().from(categories);

    const [userOne] = await tdb
      .insert(users)
      .values({
        name: 'DM Cascade UserOne',
        identity: 'dmcascadeuserone',
        password: 'hash',
        avatarId: null,
        bannerId: null,
        bio: null,
        bannerColor: null,
        createdAt: Date.now()
      })
      .returning();

    const [userTwo] = await tdb
      .insert(users)
      .values({
        name: 'DM Cascade UserTwo',
        identity: 'dmcascadeusertwo',
        password: 'hash',
        avatarId: null,
        bannerId: null,
        bio: null,
        bannerColor: null,
        createdAt: Date.now()
      })
      .returning();

    let categoryId = categoriesBefore[0]?.id;

    if (!categoryId) {
      const [cat] = await tdb
        .insert(categories)
        .values({ name: 'DM Category 2', position: 1, createdAt: Date.now() })
        .returning();
      categoryId = cat!.id;
    }

    const [dmChannel] = await tdb
      .insert(channels)
      .values({
        type: 'TEXT',
        name: 'dm-channel-u1',
        position: 0,
        fileAccessToken: 'dm-token-u1',
        fileAccessTokenUpdatedAt: Date.now(),
        categoryId,
        isDm: true,
        createdAt: Date.now()
      })
      .returning();

    await tdb.insert(directMessages).values({
      channelId: dmChannel!.id,
      userOneId: userOne!.id,
      userTwoId: userTwo!.id,
      createdAt: Date.now()
    });

    const dmsBefore = await tdb
      .select()
      .from(directMessages)
      .where(eq(directMessages.channelId, dmChannel!.id));

    expect(dmsBefore.length).toBe(1);

    await tdb.delete(users).where(eq(users.id, userOne!.id));

    const dmsAfter = await tdb
      .select()
      .from(directMessages)
      .where(eq(directMessages.channelId, dmChannel!.id));

    expect(dmsAfter.length).toBe(0);
  });

  test('deleting userTwo cascades to direct_messages', async () => {
    const categoriesBefore = await tdb.select().from(categories);

    const [userOne] = await tdb
      .insert(users)
      .values({
        name: 'DM Cascade2 UserOne',
        identity: 'dmcascade2userone',
        password: 'hash',
        avatarId: null,
        bannerId: null,
        bio: null,
        bannerColor: null,
        createdAt: Date.now()
      })
      .returning();

    const [userTwo] = await tdb
      .insert(users)
      .values({
        name: 'DM Cascade2 UserTwo',
        identity: 'dmcascade2usertwo',
        password: 'hash',
        avatarId: null,
        bannerId: null,
        bio: null,
        bannerColor: null,
        createdAt: Date.now()
      })
      .returning();

    let categoryId = categoriesBefore[0]?.id;

    if (!categoryId) {
      const [cat] = await tdb
        .insert(categories)
        .values({ name: 'DM Category 3', position: 1, createdAt: Date.now() })
        .returning();
      categoryId = cat!.id;
    }

    const [dmChannel] = await tdb
      .insert(channels)
      .values({
        type: 'TEXT',
        name: 'dm-channel-u2',
        position: 0,
        fileAccessToken: 'dm-token-u2',
        fileAccessTokenUpdatedAt: Date.now(),
        categoryId,
        isDm: true,
        createdAt: Date.now()
      })
      .returning();

    await tdb.insert(directMessages).values({
      channelId: dmChannel!.id,
      userOneId: userOne!.id,
      userTwoId: userTwo!.id,
      createdAt: Date.now()
    });

    const dmsBefore = await tdb
      .select()
      .from(directMessages)
      .where(eq(directMessages.channelId, dmChannel!.id));

    expect(dmsBefore.length).toBe(1);

    await tdb.delete(users).where(eq(users.id, userTwo!.id));

    const dmsAfter = await tdb
      .select()
      .from(directMessages)
      .where(eq(directMessages.channelId, dmChannel!.id));

    expect(dmsAfter.length).toBe(0);
  });
});
