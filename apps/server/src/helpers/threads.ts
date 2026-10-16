import { getMentions } from '@sharkord/shared';
import { and, eq, gt, inArray, lt, ne, or, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { publishThreadFollowers } from '../db/publishers';
import { getLatestThreadReply } from '../db/queries/threads';
import { messages, threadFollowers, userRoles, users } from '../db/schema';
import { invariant } from '../utils/invariant';
import type { Context } from '../utils/trpc';
import { assertChannelAccess } from './assert-channel-access';

type TThreadReply = {
  id: number;
  parentMessageId: number;
  channelId: number;
  userId: number | null;
  content: string | null;
  createdAt: number;
};

const getExistingUserIds = async (userIds: number[]) => {
  if (userIds.length === 0) return [];

  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.id, userIds));

  return rows.map(({ id }) => id);
};

const loadThreadParent = async (ctx: Context, parentMessageId: number) => {
  const parentMessage = await db
    .select({
      id: messages.id,
      channelId: messages.channelId,
      parentMessageId: messages.parentMessageId,
      createdAt: messages.createdAt
    })
    .from(messages)
    .where(eq(messages.id, parentMessageId))
    .limit(1)
    .get();

  invariant(parentMessage, {
    code: 'NOT_FOUND',
    message: 'Parent message not found'
  });

  await assertChannelAccess(ctx, parentMessage.channelId);

  invariant(!parentMessage.parentMessageId, {
    code: 'BAD_REQUEST',
    message: 'Cannot get thread for a reply message'
  });

  return parentMessage;
};

const followThreadOnReply = async (reply: TThreadReply) => {
  const mentions = getMentions(reply.content);

  const [parentMessage, earlierReply, mentionedUserIds] = await Promise.all([
    db
      .select({ userId: messages.userId })
      .from(messages)
      .where(eq(messages.id, reply.parentMessageId))
      .limit(1)
      .get(),
    db
      .select({ id: messages.id })
      .from(messages)
      .where(
        and(
          eq(messages.parentMessageId, reply.parentMessageId),
          lt(messages.id, reply.id)
        )
      )
      .limit(1)
      .get(),
    getExistingUserIds(mentions.userIds)
  ]);

  const pulledInUserIds = new Set(mentionedUserIds);

  // only the first reply pulls in the parent's author, otherwise every later reply would
  // follow them again after they unfollowed
  if (parentMessage?.userId && !earlierReply) {
    pulledInUserIds.add(parentMessage.userId);
  }

  if (reply.userId) {
    pulledInUserIds.delete(reply.userId);
  }

  const mentionedFollowers: SQL[] = [];

  if (mentionedUserIds.length > 0) {
    mentionedFollowers.push(inArray(threadFollowers.userId, mentionedUserIds));
  }

  if (mentions.roleIds.length > 0) {
    mentionedFollowers.push(
      inArray(
        threadFollowers.userId,
        db
          .select({ userId: userRoles.userId })
          .from(userRoles)
          .where(inArray(userRoles.roleId, mentions.roleIds))
      )
    );
  }

  const now = Date.now();

  db.transaction((tx) => {
    tx.update(threadFollowers)
      .set({ lastReplyAt: reply.createdAt })
      .where(eq(threadFollowers.parentMessageId, reply.parentMessageId))
      .run();

    if (pulledInUserIds.size > 0) {
      tx.insert(threadFollowers)
        .values(
          [...pulledInUserIds].map((userId) => ({
            userId,
            parentMessageId: reply.parentMessageId,
            // ids only grow, so this marks everything before the reply that pulled them in
            // as read, and only the reply itself as unread
            lastReadMessageId: reply.id - 1,
            lastReplyAt: reply.createdAt,
            createdAt: now
          }))
        )
        .onConflictDoNothing()
        .run();
    }

    if (reply.userId) {
      tx.insert(threadFollowers)
        .values({
          userId: reply.userId,
          parentMessageId: reply.parentMessageId,
          lastReadMessageId: reply.id,
          lastReplyAt: reply.createdAt,
          createdAt: now
        })
        .onConflictDoUpdate({
          target: [threadFollowers.userId, threadFollowers.parentMessageId],
          set: { lastReadMessageId: reply.id, hasUnreadMention: false }
        })
        .run();
    }

    // after the inserts, so the users this reply pulled in are flagged too
    if (mentionedFollowers.length > 0) {
      tx.update(threadFollowers)
        .set({ hasUnreadMention: true })
        .where(
          and(
            eq(threadFollowers.parentMessageId, reply.parentMessageId),
            reply.userId ? ne(threadFollowers.userId, reply.userId) : undefined,
            or(...mentionedFollowers)
          )
        )
        .run();
    }
  });

  await publishThreadFollowers(reply.parentMessageId, reply.channelId);
};

const refreshThreadFollowers = async (
  parentMessageId: number,
  channelId: number
) => {
  db.transaction((tx) => {
    const followers = tx
      .select({
        userId: threadFollowers.userId,
        lastReadMessageId: threadFollowers.lastReadMessageId
      })
      .from(threadFollowers)
      .where(eq(threadFollowers.parentMessageId, parentMessageId))
      .all();

    if (followers.length === 0) return;

    const oldestReadMessageId = Math.min(
      ...followers.map(({ lastReadMessageId }) => lastReadMessageId ?? 0)
    );

    const unreadReplies = tx
      .select({
        id: messages.id,
        userId: messages.userId,
        content: messages.content
      })
      .from(messages)
      .where(
        and(
          eq(messages.parentMessageId, parentMessageId),
          gt(messages.id, oldestReadMessageId)
        )
      )
      .all();

    const mentioningReplies = [];

    for (const reply of unreadReplies) {
      const { userIds, roleIds } = getMentions(reply.content);

      if (userIds.length > 0 || roleIds.length > 0) {
        mentioningReplies.push({
          id: reply.id,
          userId: reply.userId,
          userIds,
          roleIds
        });
      }
    }

    const mentionedUserIds: number[] = [];

    if (mentioningReplies.length > 0) {
      const followerRoles = tx
        .select({ userId: userRoles.userId, roleId: userRoles.roleId })
        .from(userRoles)
        .where(
          inArray(
            userRoles.userId,
            followers.map(({ userId }) => userId)
          )
        )
        .all();

      const followerRoleKeys = new Set(
        followerRoles.map(({ userId, roleId }) => `${userId}:${roleId}`)
      );

      for (const { userId, lastReadMessageId } of followers) {
        const isMentioned = mentioningReplies.some(
          (reply) =>
            reply.id > (lastReadMessageId ?? 0) &&
            reply.userId !== userId &&
            (reply.userIds.includes(userId) ||
              reply.roleIds.some((roleId) =>
                followerRoleKeys.has(`${userId}:${roleId}`)
              ))
        );

        if (isMentioned) mentionedUserIds.push(userId);
      }
    }

    tx.update(threadFollowers)
      .set({ hasUnreadMention: false })
      .where(eq(threadFollowers.parentMessageId, parentMessageId))
      .run();

    if (mentionedUserIds.length > 0) {
      tx.update(threadFollowers)
        .set({ hasUnreadMention: true })
        .where(
          and(
            eq(threadFollowers.parentMessageId, parentMessageId),
            inArray(threadFollowers.userId, mentionedUserIds)
          )
        )
        .run();
    }
  });

  await publishThreadFollowers(parentMessageId, channelId);
};

// an edit can mention someone new, who then follows like any other mention, and can add or
// drop a mention of a follower, whose badge has to be worked out again
const followThreadOnEdit = async (reply: Omit<TThreadReply, 'createdAt'>) => {
  const { userIds } = getMentions(reply.content);
  const mentionedUserIds = await getExistingUserIds(userIds);
  const pulledInUserIds = mentionedUserIds.filter(
    (userId) => userId !== reply.userId
  );

  if (pulledInUserIds.length > 0) {
    const latestReply = await getLatestThreadReply(reply.parentMessageId);
    const now = Date.now();

    await db
      .insert(threadFollowers)
      .values(
        pulledInUserIds.map((userId) => ({
          userId,
          parentMessageId: reply.parentMessageId,
          lastReadMessageId: reply.id - 1,
          lastReplyAt: latestReply?.createdAt ?? now,
          createdAt: now
        }))
      )
      .onConflictDoNothing();
  }

  await refreshThreadFollowers(reply.parentMessageId, reply.channelId);
};

export {
  followThreadOnEdit,
  followThreadOnReply,
  loadThreadParent,
  refreshThreadFollowers
};
