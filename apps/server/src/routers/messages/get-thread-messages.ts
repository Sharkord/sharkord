import {
  DEFAULT_MESSAGES_LIMIT,
  zMessagesCursor,
  type TMessage
} from '@sharkord/shared';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { getMessagesPage } from '../../db/queries/messages';
import { messages } from '../../db/schema';
import { loadThreadParent } from '../../helpers/threads';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const getThreadMessagesRoute = protectedProcedure
  .input(
    z.object({
      parentMessageId: z.number(),
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
  .query(async ({ ctx, input }) => {
    const { parentMessageId, cursor, limit, targetMessageId } = input;

    await loadThreadParent(ctx, parentMessageId);

    const where = eq(messages.parentMessageId, parentMessageId);

    let target: Pick<TMessage, 'createdAt'> | undefined;

    if (targetMessageId) {
      const targetMessage = await db
        .select({ createdAt: messages.createdAt })
        .from(messages)
        .where(and(eq(messages.id, targetMessageId), where))
        .get();

      invariant(targetMessage, {
        code: 'NOT_FOUND',
        message: 'Target message not found'
      });

      target = targetMessage;
    }

    return getMessagesPage({ where, cursor, limit, target });
  });

export { getThreadMessagesRoute };
