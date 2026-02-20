import {
  ChannelPermission,
  DEFAULT_MESSAGES_LIMIT,
  ServerEvents,
  type TFile,
  type TJoinedMessage,
  type TJoinedMessageReaction,
  type TMessage
} from '@sharkord/shared';
import { and, count, desc, eq, inArray, isNull, lt } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { z } from 'zod';
import { db } from '../../db';
import { getChannelsReadStatesForUser } from '../../db/queries/channels';
import {
  channelReadStates,
  channels,
  files,
  messageFiles,
  messageReactions,
  messages
} from '../../db/schema';
import { generateFileToken } from '../../helpers/files-crypto';
import { invariant } from '../../utils/invariant';
import { pubsub } from '../../utils/pubsub';
import { protectedProcedure } from '../../utils/trpc';

const getMessagesRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number(),
      cursor: z.number().nullish(),
      limit: z.number().default(DEFAULT_MESSAGES_LIMIT)
    })
  )
  .meta({ infinite: true })
  .query(async ({ ctx, input }) => {
    await ctx.needsChannelPermission(
      input.channelId,
      ChannelPermission.VIEW_CHANNEL
    );

    const { channelId, cursor, limit } = input;

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

    // only root messages (not thread replies)
    const rows: TMessage[] = await db
      .select()
      .from(messages)
      .where(
        cursor
          ? and(
              eq(messages.channelId, channelId),
              isNull(messages.parentMessageId),
              lt(messages.createdAt, cursor)
            )
          : and(
              eq(messages.channelId, channelId),
              isNull(messages.parentMessageId)
            )
      )
      .orderBy(desc(messages.createdAt))
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

    const replies = alias(messages, 'replies');

    const [fileRows, reactionRows, replyCountRows] = await Promise.all([
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
        .where(inArray(messageReactions.messageId, messageIds)),
      db
        .select({
          parentMessageId: replies.parentMessageId,
          count: count()
        })
        .from(replies)
        .where(inArray(replies.parentMessageId, messageIds))
        .groupBy(replies.parentMessageId)
    ]);

    const filesByMessage = fileRows.reduce<Record<number, TFile[]>>(
      (acc, row) => {
        if (!acc[row.messageId]) {
          acc[row.messageId] = [];
        }

        const rowCopy: TFile = { ...row.file };

        if (channel.private) {
          // when a channel is private, we need to generate access tokens for each file
          // this allows files to be accessed only by users who have access to the channel
          // however, if a user decides to share the file link, they can do so and anyone with the link can access it
          // this is by design
          // the access token is generated using the channel's file access token
          // so if an admin wants to invalidate all file links, they can simply regenerate the channel's file access token

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

    const replyCountByMessage = replyCountRows.reduce<Record<number, number>>(
      (acc, r) => {
        if (r.parentMessageId !== null) {
          acc[r.parentMessageId] = r.count;
        }
        return acc;
      },
      {}
    );

    // Combine messages with files, reactions, and reply counts
    const messagesWithFiles: TJoinedMessage[] = rows.map((msg) => ({
      ...msg,
      files: filesByMessage[msg.id] ?? [],
      reactions: reactionsByMessage[msg.id] ?? [],
      replyCount: replyCountByMessage[msg.id] ?? 0
    }));

    // always update read state to the absolute latest message in the channel
    // (not just the newest in this batch, in case user is scrolling back through history)
    // this is not ideal, but it's good enough for now
    const [, , latestMessage] = await Promise.all([
      Promise.resolve(fileRows),
      Promise.resolve(reactionRows),
      db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.channelId, channelId),
            isNull(messages.parentMessageId)
          )
        )
        .orderBy(desc(messages.createdAt))
        .limit(1)
        .get()
    ]);

    if (latestMessage) {
      await db
        .insert(channelReadStates)
        .values({
          channelId,
          userId: ctx.userId,
          lastReadMessageId: latestMessage.id,
          lastReadAt: Date.now()
        })
        .onConflictDoUpdate({
          target: [channelReadStates.channelId, channelReadStates.userId],
          set: {
            lastReadMessageId: latestMessage.id,
            lastReadAt: Date.now()
          }
        });

      const updatedReadStates = await getChannelsReadStatesForUser(
        ctx.userId,
        channelId
      );

      pubsub.publishFor(ctx.userId, ServerEvents.CHANNEL_READ_STATES_UPDATE, {
        channelId,
        count: updatedReadStates[channelId] ?? 0
      });
    }

    return { messages: messagesWithFiles, nextCursor };
  });

export { getMessagesRoute };
