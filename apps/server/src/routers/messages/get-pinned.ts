import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db';
import { joinMessagesWithRelations } from '../../db/queries/messages';
import { messages } from '../../db/schema';
import { assertChannelAccess } from '../../helpers/assert-channel-access';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const getPinnedRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.getMessages.maxRequests,
  windowMs: config.rateLimiters.getMessages.windowMs,
  logLabel: 'getPinned'
})
  .input(
    z.object({
      channelId: z.number()
    })
  )
  .query(async ({ ctx, input }) => {
    await assertChannelAccess(ctx, input.channelId);

    const rows = await db
      .select()
      .from(messages)
      .where(
        and(eq(messages.channelId, input.channelId), eq(messages.pinned, true))
      )
      .orderBy(desc(messages.createdAt));

    return joinMessagesWithRelations(rows);
  });

export { getPinnedRoute };
