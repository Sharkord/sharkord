import {
  DEFAULT_MESSAGES_LIMIT,
  zMessagesCursor,
  type TMessage,
  type TMessagesCursor
} from '@sharkord/shared';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  or
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db';
import { joinMessagesWithRelations } from '../../db/queries/messages';
import { channels, messages } from '../../db/schema';
import { assertChannelAccess } from '../../helpers/assert-channel-access';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const JUMP_CONTEXT_LIMIT = 20;

const getMessagesRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.getMessages.maxRequests,
  windowMs: config.rateLimiters.getMessages.windowMs,
  logLabel: 'getMessages'
})
  .input(
    z.object({
      channelId: z.number(),
      cursor: zMessagesCursor.nullish(),
      targetMessageId: z.number().nullish(),
      limit: z
        .number()
        .int()
        .min(1)
        .max(DEFAULT_MESSAGES_LIMIT)
        .default(DEFAULT_MESSAGES_LIMIT)
    })
  )
  .meta({ infinite: true })
  .query(async ({ ctx, input }) => {
    await assertChannelAccess(ctx, input.channelId);

    const { channelId, cursor, limit, targetMessageId } = input;

    const channel = await db
      .select({
        id: channels.id
      })
      .from(channels)
      .where(eq(channels.id, channelId))
      .get();

    invariant(channel, {
      code: 'NOT_FOUND',
      message: 'Channel not found'
    });

    const baseWhere = and(
      eq(messages.channelId, channelId),
      isNull(messages.parentMessageId)
    );

    let rows: TMessage[];
    let nextCursor: TMessagesCursor | null = null;
    // true when a jump window stops short of the newest message, so the client knows its list
    // is not contiguous with the present and must offer a way back
    let hasNewer = false;

    if (targetMessageId) {
      // fetch all messages from newest down to (and including) the target
      const targetMessage = await db
        .select({
          id: messages.id,
          createdAt: messages.createdAt,
          parentMessageId: messages.parentMessageId
        })
        .from(messages)
        .where(
          and(
            eq(messages.id, targetMessageId),
            eq(messages.channelId, channelId)
          )
        )
        .get();

      invariant(targetMessage, {
        code: 'NOT_FOUND',
        message: 'Target message not found'
      });

      invariant(!targetMessage.parentMessageId, {
        code: 'BAD_REQUEST',
        message: 'Target message must be a root message'
      });

      // a window around the target rather than everything since it: linking to a message from
      // a year ago used to load a year of history, joined with files, reactions and reply
      // previews, in one response
      const [olderMessages, newerMessages] = await Promise.all([
        db
          .select()
          .from(messages)
          .where(
            and(baseWhere, lt(messages.createdAt, targetMessage.createdAt))
          )
          .orderBy(desc(messages.createdAt), desc(messages.id))
          .limit(JUMP_CONTEXT_LIMIT + 1),
        // ascending, so the window is anchored at the target and grows towards the present.
        // ordering this half descending takes the newest messages in the channel instead,
        // which leaves the target outside its own window once the limit bites
        db
          .select()
          .from(messages)
          .where(
            and(baseWhere, gte(messages.createdAt, targetMessage.createdAt))
          )
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
      // keep the channel's page-1 cursor, which points somewhere else entirely
      nextCursor =
        hasOlder && oldestReturnedMessage
          ? {
              createdAt: oldestReturnedMessage.createdAt,
              id: oldestReturnedMessage.id
            }
          : null;
    } else {
      // standard cursor-based pagination
      rows = await db
        .select()
        .from(messages)
        .where(
          cursor
            ? and(
                baseWhere,
                or(
                  lt(messages.createdAt, cursor.createdAt),
                  and(
                    eq(messages.createdAt, cursor.createdAt),
                    lt(messages.id, cursor.id)
                  )
                )
              )
            : baseWhere
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

    if (rows.length === 0) {
      return { messages: [], nextCursor, hasNewer };
    }

    const messagesWithRelations = await joinMessagesWithRelations(rows);

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

    return { messages: messagesWithReplyCounts, nextCursor, hasNewer };
  });

export { getMessagesRoute };
