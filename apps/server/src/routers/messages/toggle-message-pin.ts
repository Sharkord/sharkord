import { ActivityLogType, Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishMessage } from '../../db/publishers';
import { messages } from '../../db/schema';
import { loadMessageForWrite } from '../../helpers/load-message-for-write';
import { eventBus } from '../../plugins/event-bus';
import { enqueueActivityLog } from '../../queues/activity-log';
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

    const message = await loadMessageForWrite(ctx, input.messageId);

    invariant(!message.parentMessageId, {
      code: 'BAD_REQUEST',
      message: 'Cannot pin a thread message'
    });

    const now = Date.now();
    const isPinning = !message.pinned;

    await db
      .update(messages)
      .set({
        pinned: isPinning,
        pinnedAt: isPinning ? now : null,
        pinnedBy: isPinning ? ctx.user.id : null,
        updatedAt: now
      })
      .where(eq(messages.id, input.messageId));

    publishMessage(input.messageId, message.channelId, 'update');

    eventBus.emit(isPinning ? 'message:pinned' : 'message:unpinned', {
      messageId: input.messageId,
      channelId: message.channelId,
      userId: ctx.user.id
    });

    enqueueActivityLog({
      type: ActivityLogType.TOGGLED_MESSAGE_PIN,
      userId: ctx.user.id,
      details: {
        messageId: input.messageId,
        channelId: message.channelId,
        pinned: !message.pinned,
        pinnedBy: ctx.user.id
      }
    });
  });

export { toggleMessagePinRoute };
