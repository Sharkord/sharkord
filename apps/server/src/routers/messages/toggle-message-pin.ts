import { Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishMessage } from '../../db/publishers';
import { messages } from '../../db/schema';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const toggleMessagePinRoute = protectedProcedure
  .input(
    z.object({
      messageId: z.number()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.PIN_MESSAGES);

    const message = await db
      .select()
      .from(messages)
      .where(eq(messages.id, input.messageId))
      .get();

    invariant(message, {
      code: 'NOT_FOUND',
      message: 'Message not found'
    });

    invariant(!message.parentMessageId, {
      code: 'BAD_REQUEST',
      message: 'Cannot pin a thread message'
    });

    const now = Date.now();

    await db
      .update(messages)
      .set({
        pinned: !message.pinned,
        pinnedAt: now,
        pinnedBy: ctx.user.id,
        updatedAt: now
      })
      .where(eq(messages.id, input.messageId));

    publishMessage(input.messageId, message.channelId, 'update');
  });

export { toggleMessagePinRoute };
