import type {
  TFollowedThread,
  TFollowedThreadsMap,
  TMessagesCursor,
  TThreadSummary
} from '@sharkord/shared';
import { and, count, desc, eq, inArray, lt, or, sql } from 'drizzle-orm';
import { db } from '..';
import { messages, threadFollowers } from '../schema';

const THREAD_SUMMARY_USERS_LIMIT = 6;

const getThreadSummaries = async (parentMessageIds: number[]) => {
  const summaries = new Map<number, TThreadSummary>();

  if (parentMessageIds.length > 0) {
    const [replyCounts, recentRepliers] = await Promise.all([
      db
        .select({
          parentMessageId: messages.parentMessageId,
          replyCount: count()
        })
        .from(messages)
        .where(inArray(messages.parentMessageId, parentMessageIds))
        .groupBy(messages.parentMessageId),
      db.all<{ parentMessageId: number; userId: number }>(sql`
        SELECT parent_message_id AS parentMessageId, user_id AS userId
        FROM (
          SELECT
            parent_message_id,
            user_id,
            ROW_NUMBER() OVER (
              PARTITION BY parent_message_id ORDER BY MAX(id) DESC
            ) AS position
          FROM messages
          WHERE ${inArray(messages.parentMessageId, parentMessageIds)}
            AND user_id IS NOT NULL
          GROUP BY parent_message_id, user_id
        )
        WHERE position <= ${THREAD_SUMMARY_USERS_LIMIT}
        ORDER BY parent_message_id, position
      `)
    ]);

    for (const { parentMessageId, replyCount } of replyCounts) {
      if (parentMessageId === null) continue;

      summaries.set(parentMessageId, { replyCount, replyUserIds: [] });
    }

    for (const { parentMessageId, userId } of recentRepliers) {
      const summary = summaries.get(parentMessageId);

      if (summary) summary.replyUserIds.push(userId);
    }
  }

  return (parentMessageId: number): TThreadSummary =>
    summaries.get(parentMessageId) ?? { replyCount: 0, replyUserIds: [] };
};

// the badge shows 99+ past 99, so counting further only costs time on threads a follower never
// opens, where unread replies pile up without bound
const UNREAD_COUNT_LIMIT = 100;

// the outer columns are written out by hand: drizzle leaves them unqualified in a single table
// select, where they would resolve to the subquery's own messages columns instead
const followerUnreadCount = sql<number>`(
  SELECT count(*) FROM (
    SELECT 1 FROM messages AS unread_replies
    WHERE unread_replies.parent_message_id = thread_followers.parent_message_id
      AND unread_replies.id > coalesce(thread_followers.last_read_message_id, 0)
      AND (
        unread_replies.user_id IS NULL
        OR unread_replies.user_id <> thread_followers.user_id
      )
    LIMIT ${UNREAD_COUNT_LIMIT}
  )
)`.mapWith(Number);

const getLatestThreadReply = async (parentMessageId: number) =>
  db
    .select({ id: messages.id, createdAt: messages.createdAt })
    .from(messages)
    .where(eq(messages.parentMessageId, parentMessageId))
    .orderBy(desc(messages.id))
    .limit(1)
    .get();

const getThreadUnreadCountsByFollower = async (parentMessageId: number) =>
  db
    .select({
      userId: threadFollowers.userId,
      unreadCount: followerUnreadCount,
      hasUnreadMention: threadFollowers.hasUnreadMention
    })
    .from(threadFollowers)
    .where(eq(threadFollowers.parentMessageId, parentMessageId));

const getFollowedThreadsForUser = async (
  userId: number,
  channelIds: number[]
): Promise<TFollowedThreadsMap> => {
  if (channelIds.length === 0) return {};

  const rows = await db
    .select({
      parentMessageId: threadFollowers.parentMessageId,
      unreadCount: followerUnreadCount,
      hasUnreadMention: threadFollowers.hasUnreadMention
    })
    .from(threadFollowers)
    .innerJoin(
      messages,
      and(
        eq(messages.id, threadFollowers.parentMessageId),
        inArray(messages.channelId, channelIds)
      )
    )
    .where(eq(threadFollowers.userId, userId));

  const followedThreads: TFollowedThreadsMap = {};

  for (const { parentMessageId, unreadCount, hasUnreadMention } of rows) {
    followedThreads[parentMessageId] = { unreadCount, hasUnreadMention };
  }

  return followedThreads;
};

const followedThreadColumns = {
  parentMessageId: threadFollowers.parentMessageId,
  lastReplyAt: threadFollowers.lastReplyAt,
  channelId: messages.channelId,
  userId: messages.userId,
  pluginId: messages.pluginId,
  content: messages.content
};

type TFollowedThreadRow = Omit<TFollowedThread, keyof TThreadSummary>;

const withThreadSummaries = async (
  rows: TFollowedThreadRow[]
): Promise<TFollowedThread[]> => {
  if (rows.length === 0) return [];

  const getThreadSummary = await getThreadSummaries(
    rows.map((row) => row.parentMessageId)
  );

  return rows.map((row) => ({
    ...row,
    ...getThreadSummary(row.parentMessageId)
  }));
};

const getFollowedThreadsPage = async (
  userId: number,
  channelIds: number[],
  cursor: TMessagesCursor | null | undefined,
  limit: number
) => {
  if (channelIds.length === 0) {
    return { threads: [], nextCursor: null };
  }

  const rows = await db
    .select(followedThreadColumns)
    .from(threadFollowers)
    .innerJoin(
      messages,
      and(
        eq(messages.id, threadFollowers.parentMessageId),
        inArray(messages.channelId, channelIds)
      )
    )
    .where(
      and(
        eq(threadFollowers.userId, userId),
        cursor
          ? or(
              lt(threadFollowers.lastReplyAt, cursor.createdAt),
              and(
                eq(threadFollowers.lastReplyAt, cursor.createdAt),
                lt(threadFollowers.parentMessageId, cursor.id)
              )
            )
          : undefined
      )
    )
    .orderBy(
      desc(threadFollowers.lastReplyAt),
      desc(threadFollowers.parentMessageId)
    )
    .limit(limit + 1);

  let nextCursor: TMessagesCursor | null = null;

  if (rows.length > limit) {
    rows.pop();

    const lastRow = rows.at(-1);

    nextCursor = lastRow
      ? { createdAt: lastRow.lastReplyAt, id: lastRow.parentMessageId }
      : null;
  }

  const threads = await withThreadSummaries(rows);

  return { threads, nextCursor };
};

const getFollowedThread = async (
  userId: number,
  parentMessageId: number
): Promise<TFollowedThread | null> => {
  const row = await db
    .select(followedThreadColumns)
    .from(threadFollowers)
    .innerJoin(messages, eq(messages.id, threadFollowers.parentMessageId))
    .where(
      and(
        eq(threadFollowers.userId, userId),
        eq(threadFollowers.parentMessageId, parentMessageId)
      )
    )
    .limit(1)
    .get();

  if (!row) return null;

  const [thread] = await withThreadSummaries([row]);

  return thread ?? null;
};

export {
  getFollowedThread,
  getFollowedThreadsForUser,
  getFollowedThreadsPage,
  getLatestThreadReply,
  getThreadSummaries,
  getThreadUnreadCountsByFollower
};
