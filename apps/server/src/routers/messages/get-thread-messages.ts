import {
  ChannelPermission,
  DEFAULT_MESSAGES_LIMIT,
  type TFile,
  type TJoinedMessage,
  type TJoinedMessageReaction,
  type TMessage
} from '@sharkord/shared';
import { and, asc, eq, gt, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import {
  channels,
  files,
  messageFiles,
  messageReactions,
  messages
} from '../../db/schema';
import { generateFileToken } from '../../helpers/files-crypto';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const getThreadMessagesRoute = protectedProcedure
  .input(
    z.object({
      parentMessageId: z.number(),
      cursor: z.number().nullish(),
      limit: z.number().default(DEFAULT_MESSAGES_LIMIT)
    })
  )
  .meta({ infinite: true })
  .query(async ({ ctx, input }) => {
    const { parentMessageId, cursor, limit } = input;

    const parentMessage = await db
      .select()
      .from(messages)
      .where(eq(messages.id, parentMessageId))
      .limit(1)
      .get();

    invariant(parentMessage, {
      code: 'NOT_FOUND',
      message: 'Parent message not found'
    });

    invariant(!parentMessage.parentMessageId, {
      code: 'BAD_REQUEST',
      message: 'Cannot get thread for a reply message'
    });

    const channelId = parentMessage.channelId;

    await ctx.needsChannelPermission(channelId, ChannelPermission.VIEW_CHANNEL);

    const channel = await db
      .select({
        private: channels.private,
        fileAccessToken: channels.fileAccessToken
      })
      .from(channels)
      .where(eq(channels.id, channelId))
      .get();

    invariant(channel, {
      code: 'NOT_FOUND',
      message: 'Channel not found'
    });

    const rows: TMessage[] = await db
      .select()
      .from(messages)
      .where(
        cursor
          ? and(
              eq(messages.parentMessageId, parentMessageId),
              gt(messages.createdAt, cursor)
            )
          : eq(messages.parentMessageId, parentMessageId)
      )
      .orderBy(asc(messages.createdAt))
      .limit(limit + 1);

    let nextCursor: number | null = null;

    if (rows.length > limit) {
      const next = rows.pop();
      nextCursor = next ? next.createdAt : null;
    }

    if (rows.length === 0) {
      return { messages: [], nextCursor };
    }

    const messageIds = rows.map((m) => m.id);

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

        const rowCopy: TFile = { ...row.file };

        if (channel.private) {
          rowCopy._accessToken = generateFileToken(
            row.file.id,
            channel.fileAccessToken
          );
        }

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
        file: r.file
      };

      if (!acc[r.messageId]) {
        acc[r.messageId] = [];
      }

      acc[r.messageId]!.push(reaction);

      return acc;
    }, {});

    const messagesWithFiles: TJoinedMessage[] = rows.map((msg) => ({
      ...msg,
      files: filesByMessage[msg.id] ?? [],
      reactions: reactionsByMessage[msg.id] ?? []
    }));

    return { messages: messagesWithFiles, nextCursor };
  });

export { getThreadMessagesRoute };
