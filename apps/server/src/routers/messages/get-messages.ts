import {
  ChannelPermission,
  DEFAULT_MESSAGES_LIMIT,
  ServerEvents,
  type TMessage
} from '@sharkord/shared';
import { and, count, desc, eq, inArray, isNull, lt } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { z } from 'zod';
import { db } from '../../db';
import { getChannelsReadStatesForUser } from '../../db/queries/channels';
import { joinMessagesWithRelations } from '../../db/queries/messages';
import { channelReadStates, channels, messages } from '../../db/schema';
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

    const messagesWithRelations = await joinMessagesWithRelations(
      rows,
      channel
    );

    const messageIds = rows.map((m) => m.id);
    const replies = alias(messages, 'replies');

    const replyCountRows = await db
      .select({
        parentMessageId: replies.parentMessageId,
        count: count()
      })
      .from(replies)
      .where(inArray(replies.parentMessageId, messageIds))
      .groupBy(replies.parentMessageId);

    const replyCountByMessage = replyCountRows.reduce<Record<number, number>>(
      (acc, r) => {
        if (r.parentMessageId !== null) {
          acc[r.parentMessageId] = r.count;
        }
        return acc;
      },
      {}
    );

    const messagesWithReplyCounts = messagesWithRelations.map((msg) => ({
      ...msg,
      replyCount: replyCountByMessage[msg.id] ?? 0
    }));

    // always update read state to the absolute latest message in the channel
    // (not just the newest in this batch, in case user is scrolling back through history)
    // this is not ideal, but it's good enough for now
    const latestMessage = await db
      .select()
      .from(messages)
      .where(
        and(eq(messages.channelId, channelId), isNull(messages.parentMessageId))
      )
      .orderBy(desc(messages.createdAt))
      .limit(1)
      .get();

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

    return { messages: messagesWithReplyCounts, nextCursor };
  });

export { getMessagesRoute };
