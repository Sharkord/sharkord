import { DEFAULT_MESSAGES_LIMIT, type TMessage } from '@sharkord/shared';
import { and, asc, eq, gt } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import {
  assertDmParticipant,
  isDirectMessageChannel
} from '../../db/queries/dms';
import { joinMessagesWithRelations } from '../../db/queries/messages';
import { getSettings } from '../../db/queries/server';
import { channels, messages } from '../../db/schema';
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

    const [isDmChannel, settings] = await Promise.all([
      isDirectMessageChannel(parentMessage.channelId),
      getSettings()
    ]);

    if (isDmChannel) {
      invariant(settings.directMessagesEnabled, {
        code: 'FORBIDDEN',
        message: 'Direct messages are disabled on this server'
      });

      await assertDmParticipant(parentMessage.channelId, ctx.userId);
    }

    const channel = await db
      .select({
        private: channels.private,
        fileAccessToken: channels.fileAccessToken
      })
      .from(channels)
      .where(eq(channels.id, parentMessage.channelId))
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

    const messagesWithRelations = await joinMessagesWithRelations(
      rows,
      channel
    );

    return { messages: messagesWithRelations, nextCursor };
  });

export { getThreadMessagesRoute };
