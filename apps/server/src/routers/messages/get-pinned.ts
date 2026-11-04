import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { joinMessagesWithRelations } from '../../db/queries/messages';
import { messages } from '../../db/schema';
import { assertChannelAccess } from '../../helpers/assert-channel-access';
import { protectedProcedure } from '../../utils/trpc';

const getPinnedRoute = protectedProcedure
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
