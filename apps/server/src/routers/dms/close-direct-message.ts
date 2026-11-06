import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishDirectMessageConversation } from '../../db/publishers';
import { getClosedAtKey } from '../../db/queries/dms';
import { getSettings } from '../../db/queries/server';
import { directMessages } from '../../db/schema';
import { markChannelAsRead } from '../../helpers/mark-channel-as-read';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const closeDirectMessageRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number()
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { channelId } = input;

    const dm = await db
      .select({
        userOneId: directMessages.userOneId,
        userTwoId: directMessages.userTwoId
      })
      .from(directMessages)
      .where(eq(directMessages.channelId, channelId))
      .limit(1)
      .get();

    invariant(
      dm && (dm.userOneId === ctx.userId || dm.userTwoId === ctx.userId),
      {
        code: 'NOT_FOUND',
        message: 'Conversation not found'
      }
    );

    const settings = await getSettings();

    invariant(settings.directMessagesEnabled, {
      code: 'FORBIDDEN',
      message: 'Direct messages are disabled on this server'
    });

    await db
      .update(directMessages)
      .set({ [getClosedAtKey(dm, ctx.userId)]: Date.now() })
      .where(eq(directMessages.channelId, channelId));

    await markChannelAsRead(ctx.userId, channelId);
    await publishDirectMessageConversation(ctx.userId, channelId);
  });

export { closeDirectMessageRoute };
