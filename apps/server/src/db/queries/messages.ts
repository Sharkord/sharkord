import type {
  TFile,
  TJoinedMessage,
  TJoinedMessageReaction,
  TMessage,
  TMessageReaction,
  TMessageReplyPreview,
  TMessagesCursor
} from '@sharkord/shared';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  lt,
  notExists,
  or,
  type SQL
} from 'drizzle-orm';
import { db } from '..';
import { attachFileToken, signFile } from '../../helpers/files-crypto';
import {
  directMessages,
  files,
  messageFiles,
  messageReactions,
  messages
} from '../schema';
import { getSettings } from './server';
import { getThreadSummaries } from './threads';

const getReplyPreviewByMessageId = async (rows: TMessage[]) => {
  const replyToMessageIds = [
    ...new Set(
      rows
        .map((message) => message.replyToMessageId)
        .filter((messageId): messageId is number => messageId !== null)
    )
  ];

  if (replyToMessageIds.length === 0) {
    return {};
  }

  const replyRows = await db
    .select({
      id: messages.id,
      content: messages.content,
      userId: messages.userId,
      pluginId: messages.pluginId
    })
    .from(messages)
    .where(inArray(messages.id, replyToMessageIds));

  return replyRows.reduce<Record<number, TMessageReplyPreview>>((acc, row) => {
    acc[row.id] = row;

    return acc;
  }, {});
};

const getMessageByFileId = async (
  fileId: number
): Promise<TMessage | undefined> => {
  const row = await db
    .select({ message: messages })
    .from(messageFiles)
    .innerJoin(messages, eq(messages.id, messageFiles.messageId))
    .where(eq(messageFiles.fileId, fileId))
    .get();

  return row?.message;
};

const joinMessagesWithRelations = async (
  rows: TMessage[]
): Promise<TJoinedMessage[]> => {
  if (rows.length === 0) return [];

  const messageIds = rows.map((m) => m.id);

  const { storageSignedUrlsEnabled, storageSignedUrlsTtlSeconds } =
    await getSettings();

  const [fileRows, reactionRows, replyToMap] = await Promise.all([
    db
      .select({
        messageId: messageFiles.messageId,
        file: files
      })
      .from(messageFiles)
      .innerJoin(files, eq(messageFiles.fileId, files.id))
      .where(inArray(messageFiles.messageId, messageIds)),
    db
      .select({
        messageId: messageReactions.messageId,
        userId: messageReactions.userId,
        pluginId: messageReactions.pluginId,
        emoji: messageReactions.emoji,
        createdAt: messageReactions.createdAt,
        fileId: messageReactions.fileId,
        file: files
      })
      .from(messageReactions)
      .leftJoin(files, eq(messageReactions.fileId, files.id))
      .where(inArray(messageReactions.messageId, messageIds)),
    getReplyPreviewByMessageId(rows)
  ]);

  const filesByMessage = fileRows.reduce<Record<number, TFile[]>>(
    (acc, row) => {
      if (!acc[row.messageId]) {
        acc[row.messageId] = [];
      }

      const rowCopy = attachFileToken(
        row.file,
        storageSignedUrlsEnabled,
        storageSignedUrlsTtlSeconds
      );

      acc[row.messageId]!.push(rowCopy);

      return acc;
    },
    {}
  );

  const reactionsByMessage = reactionRows.reduce<
    Record<number, TJoinedMessageReaction[]>
  >((acc, r) => {
    const reaction: TJoinedMessageReaction = {
      messageId: r.messageId,
      userId: r.userId,
      pluginId: r.pluginId,
      emoji: r.emoji,
      createdAt: r.createdAt,
      fileId: r.fileId,
      file: signFile(
        r.file,
        storageSignedUrlsEnabled,
        storageSignedUrlsTtlSeconds
      )
    };

    if (!acc[r.messageId]) {
      acc[r.messageId] = [];
    }

    acc[r.messageId]!.push(reaction);

    return acc;
  }, {});

  return rows.map((msg) => ({
    ...msg,
    files: filesByMessage[msg.id] ?? [],
    reactions: reactionsByMessage[msg.id] ?? [],
    replyTo:
      msg.replyToMessageId !== null
        ? (replyToMap[msg.replyToMessageId] ?? null)
        : null
  }));
};

const getMessage = async (
  messageId: number
): Promise<TJoinedMessage | undefined> => {
  const message = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1)
    .get();

  if (!message) return undefined;

  const [joined] = await joinMessagesWithRelations([message]);

  if (!joined) return undefined;

  // a reply cannot have a thread of its own, so skip lookup
  if (message.parentMessageId) return joined;

  const getThreadSummary = await getThreadSummaries([messageId]);

  return { ...joined, ...getThreadSummary(messageId) };
};

const getNonDirectMessagesFromUserId = async (
  userId: number,
  limit: number
): Promise<TMessage[]> =>
  db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.userId, userId),
        notExists(
          db
            .select()
            .from(directMessages)
            .where(eq(directMessages.channelId, messages.channelId))
        )
      )
    )
    .orderBy(desc(messages.createdAt))
    .limit(limit);

const getReaction = async (
  messageId: number,
  emoji: string,
  userId: number
): Promise<TMessageReaction | undefined> =>
  db
    .select()
    .from(messageReactions)
    .where(
      and(
        eq(messageReactions.messageId, messageId),
        eq(messageReactions.emoji, emoji),
        eq(messageReactions.userId, userId)
      )
    )
    .get();

const JUMP_CONTEXT_LIMIT = 20;

type TMessagesPageOptions = {
  where: SQL | undefined;
  cursor: TMessagesCursor | null | undefined;
  limit: number;
  target?: Pick<TMessage, 'createdAt'>;
};

// one page of a conversation, newest first. where selects the conversation (a channel's root
// messages or a thread's replies) and target is a message the caller already validated as
// part of it. channels and threads page the same way, so their routes only differ in those
const getMessagesPage = async ({
  where,
  cursor,
  limit,
  target
}: TMessagesPageOptions) => {
  let rows: TMessage[];
  let nextCursor: TMessagesCursor | null = null;
  // true when a jump window stops short of the newest message, so the client knows its list
  // is not contiguous with the present and must offer a way back
  let hasNewer = false;

  if (target) {
    // a window around the target rather than everything since it: linking to a message from
    // a year ago used to load a year of history, joined with files, reactions and reply
    // previews, in one response
    const [olderMessages, newerMessages] = await Promise.all([
      db
        .select()
        .from(messages)
        .where(and(where, lt(messages.createdAt, target.createdAt)))
        .orderBy(desc(messages.createdAt), desc(messages.id))
        .limit(JUMP_CONTEXT_LIMIT + 1),
      // ascending, so the window is anchored at the target and grows towards the present.
      // ordering this half descending takes the newest messages in the channel instead,
      // which leaves the target outside its own window once the limit bites
      db
        .select()
        .from(messages)
        .where(and(where, gte(messages.createdAt, target.createdAt)))
        .orderBy(asc(messages.createdAt), asc(messages.id))
        .limit(limit + 1)
    ]);

    hasNewer = newerMessages.length > limit;

    if (hasNewer) newerMessages.pop();

    newerMessages.reverse();

    const hasOlder = olderMessages.length > JUMP_CONTEXT_LIMIT;

    if (hasOlder) olderMessages.pop();

    rows = [...newerMessages, ...olderMessages];

    const oldestReturnedMessage = rows.at(-1);

    // the window paginates upward from its own oldest row, so the client does not have to
    // keep the conversation's page-1 cursor, which points somewhere else entirely
    nextCursor =
      hasOlder && oldestReturnedMessage
        ? {
            createdAt: oldestReturnedMessage.createdAt,
            id: oldestReturnedMessage.id
          }
        : null;
  } else {
    rows = await db
      .select()
      .from(messages)
      .where(
        cursor
          ? and(
              where,
              or(
                lt(messages.createdAt, cursor.createdAt),
                and(
                  eq(messages.createdAt, cursor.createdAt),
                  lt(messages.id, cursor.id)
                )
              )
            )
          : where
      )
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(limit + 1);

    if (rows.length > limit) {
      rows.pop();

      const lastReturnedMessage = rows.at(-1);

      nextCursor = lastReturnedMessage
        ? {
            createdAt: lastReturnedMessage.createdAt,
            id: lastReturnedMessage.id
          }
        : null;
    }
  }

  const joinedMessages =
    rows.length > 0 ? await joinMessagesWithRelations(rows) : [];

  return { messages: joinedMessages, nextCursor, hasNewer };
};

export {
  attachFileToken,
  getMessage,
  getMessageByFileId,
  getMessagesPage,
  getNonDirectMessagesFromUserId,
  getReaction,
  joinMessagesWithRelations
};
