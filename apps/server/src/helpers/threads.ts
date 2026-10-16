import { MessageNodeType } from '@sharkord/shared';
import { and, eq, inArray, lt } from 'drizzle-orm';
import { db } from '../db';
import { publishThreadFollowers } from '../db/publishers';
import { getLatestThreadReply } from '../db/queries/threads';
import { messages, threadFollowers, users } from '../db/schema';
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

const SPAN_TAG_PATTERN = /<span\b[^>]*>/g;
const USER_ID_ATTRIBUTE_PATTERN = /\bdata-user-id="(\d+)"/;

// role mentions are left out on purpose, they would make a whole role follow the thread
const getMentionedUserIds = (content: string) => {
  const userIds = new Set<number>();

  for (const [tag] of content.matchAll(SPAN_TAG_PATTERN)) {
    if (!tag.includes(`data-type="${MessageNodeType.MENTION}"`)) continue;

    const match = tag.match(USER_ID_ATTRIBUTE_PATTERN);

    if (match) userIds.add(Number(match[1]));
  }

  return [...userIds];
};

const getExistingMentionedUserIds = async (content: string | null) => {
  const mentionedUserIds = getMentionedUserIds(content ?? '');

  if (mentionedUserIds.length === 0) return [];

  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.id, mentionedUserIds));

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
    getExistingMentionedUserIds(reply.content)
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
          set: { lastReadMessageId: reply.id }
        })
        .run();
    }
  });

  await publishThreadFollowers(reply.parentMessageId, reply.channelId);
};

// an edit can mention someone new, who then follows like any other mention, and can add or
// drop a mention of a follower, whose badge has to be worked out again
const followThreadOnEdit = async (reply: Omit<TThreadReply, 'createdAt'>) => {
  const mentionedUserIds = await getExistingMentionedUserIds(reply.content);
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

  await publishThreadFollowers(reply.parentMessageId, reply.channelId);
};

export { followThreadOnEdit, followThreadOnReply, loadThreadParent };
