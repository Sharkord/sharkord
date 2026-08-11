import {
  DEFAULT_MESSAGES_LIMIT,
  zMessagesCursor,
  type TMessage,
  type TMessagesCursor
} from '@sharkord/shared';
import { and, asc, eq, gt, or } from 'drizzle-orm';
import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db';
import { joinMessagesWithRelations } from '../../db/queries/messages';
import { messages } from '../../db/schema';
import { assertChannelAccess } from '../../helpers/assert-channel-access';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const getThreadMessagesRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.getMessages.maxRequests,
  windowMs: config.rateLimiters.getMessages.windowMs,
  logLabel: 'getThreadMessages'
})
  .input(
    z.object({
      parentMessageId: z.number(),
      cursor: zMessagesCursor.nullish(),
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
    const { parentMessageId, cursor, limit } = input;

    const parentMessage = await db
      .select({
        id: messages.id,
        channelId: messages.channelId,
        parentMessageId: messages.parentMessageId
      })
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

    await assertChannelAccess(ctx, parentMessage.channelId);

    const rows: TMessage[] = await db
      .select()
      .from(messages)
      .where(
        cursor
          ? and(
              eq(messages.parentMessageId, parentMessageId),
              or(
                gt(messages.createdAt, cursor.createdAt),
                and(
                  eq(messages.createdAt, cursor.createdAt),
                  gt(messages.id, cursor.id)
                )
              )
            )
          : eq(messages.parentMessageId, parentMessageId)
      )
      .orderBy(asc(messages.createdAt), asc(messages.id))
      .limit(limit + 1);

    let nextCursor: TMessagesCursor | null = null;

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

    if (rows.length === 0) {
      return { messages: [], nextCursor };
    }

    const messagesWithRelations = await joinMessagesWithRelations(rows);

    return { messages: messagesWithRelations, nextCursor };
  });

export { getThreadMessagesRoute };
