import { Permission } from '@sharkord/shared';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishMessage } from '../../db/publishers';
import { messages } from '../../db/schema';
import { eventBus } from '../../plugins/event-bus';
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

    await db
      .update(messages)
      .set({ pinned: !message.pinned, updatedAt: Date.now() })
      .where(and(eq(messages.id, input.messageId)));

    publishMessage(input.messageId, message.channelId, 'update');

    eventBus.emit('message:pinned', {
      messageId: input.messageId,
      channelId: message.channelId,
      userId: message.userId,
      content: message.content ?? '',
      pinned: !message.pinned
    });
  });

export { toggleMessagePinRoute };
