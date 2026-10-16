import {
  DEFAULT_MESSAGES_LIMIT,
  zMessagesCursor,
  type TMessage
} from '@sharkord/shared';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db';
import { getMessagesPage } from '../../db/queries/messages';
import { getThreadSummaries } from '../../db/queries/threads';
import { channels, messages } from '../../db/schema';
import { assertChannelAccess } from '../../helpers/assert-channel-access';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

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

    const where = and(
      eq(messages.channelId, channelId),
      isNull(messages.parentMessageId)
    );

    let target: Pick<TMessage, 'createdAt'> | undefined;

    if (targetMessageId) {
      const targetMessage = await db
        .select({
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

      target = targetMessage;
    }

    const page = await getMessagesPage({ where, cursor, limit, target });

    const getThreadSummary = await getThreadSummaries(
      page.messages.map((message) => message.id)
    );

    return {
      ...page,
      messages: page.messages.map((message) => ({
        ...message,
        ...getThreadSummary(message.id)
      }))
    };
  });

export { getMessagesRoute };
