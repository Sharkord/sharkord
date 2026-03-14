import type {
  TFile,
  TJoinedMessage,
  TJoinedMessageReaction,
  TMessage,
  TMessageReaction
} from '@sharkord/shared';
import { and, count, desc, eq, inArray, notExists } from 'drizzle-orm';
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

  const { storageSignedUrlsEnabled, storageSignedUrlsTtlSeconds } =
    await getSettings();

  const fileRows = await db
    .select({
      file: files
    })
    .from(messageFiles)
    .innerJoin(files, eq(messageFiles.fileId, files.id))
    .where(eq(messageFiles.messageId, messageId));

  const filesForMessage: TFile[] = fileRows.map((r) =>
    attachFileToken(
      r.file,
      storageSignedUrlsEnabled,
      storageSignedUrlsTtlSeconds
    )
  );

  const reactionRows = await db
    .select({
      messageId: messageReactions.messageId,
      userId: messageReactions.userId,
      emoji: messageReactions.emoji,
      createdAt: messageReactions.createdAt,
      fileId: messageReactions.fileId,
      file: files
    })
    .from(messageReactions)
    .leftJoin(files, eq(messageReactions.fileId, files.id))
    .where(eq(messageReactions.messageId, messageId));

  const reactions: TJoinedMessageReaction[] = reactionRows.map((r) => ({
    messageId: r.messageId,
    userId: r.userId,
    emoji: r.emoji,
    createdAt: r.createdAt,
    fileId: r.fileId,
    file: signFile(
      r.file,
      storageSignedUrlsEnabled,
      storageSignedUrlsTtlSeconds
    )
  }));

  let replyCount = 0;

  if (!message.parentMessageId) {
    const replyCountRow = await db
      .select({ count: count() })
      .from(messages)
      .where(eq(messages.parentMessageId, messageId))
      .get();

    replyCount = replyCountRow?.count ?? 0;
  }

  return {
    ...message,
    files: filesForMessage ?? [],
    reactions: reactions ?? [],
    replyCount
  };
};

const getNonDirectMessagesFromUserId = async (
  userId: number
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
    .orderBy(desc(messages.createdAt));

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

const joinMessagesWithRelations = async (
  rows: TMessage[]
): Promise<TJoinedMessage[]> => {
  if (rows.length === 0) return [];

  const messageIds = rows.map((m) => m.id);

  const { storageSignedUrlsEnabled, storageSignedUrlsTtlSeconds } =
    await getSettings();

  const [fileRows, reactionRows] = await Promise.all([
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
        emoji: messageReactions.emoji,
        createdAt: messageReactions.createdAt,
        fileId: messageReactions.fileId,
        file: files
      })
      .from(messageReactions)
      .leftJoin(files, eq(messageReactions.fileId, files.id))
      .where(inArray(messageReactions.messageId, messageIds))
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
    reactions: reactionsByMessage[msg.id] ?? []
  }));
};

export {
  attachFileToken,
  getMessage,
  getMessageByFileId,
  getNonDirectMessagesFromUserId,
  getReaction,
  joinMessagesWithRelations
};
