import { ActivityLogType } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { publishMessage } from '../db/publishers';
import { messages } from '../db/schema';
import { eventBus } from '../plugins/event-bus';
import { enqueueActivityLog } from '../queues/activity-log';
import { invariant } from '../utils/invariant';
import type { TMessageForWrite } from './load-message-for-write';

const setMessagePinned = async (
  message: TMessageForWrite,
  pinned: boolean,
  actorUserId: number | null
) => {
  invariant(!message.parentMessageId, {
    code: 'BAD_REQUEST',
    message: 'Cannot pin a thread message'
  });

  const now = Date.now();

  await db
    .update(messages)
    .set({
      pinned,
      pinnedAt: pinned ? now : null,
      pinnedBy: pinned ? actorUserId : null,
      updatedAt: now
    })
    .where(eq(messages.id, message.id));

  publishMessage(message.id, message.channelId, 'update');

  eventBus.emit(pinned ? 'message:pinned' : 'message:unpinned', {
    messageId: message.id,
    channelId: message.channelId,
    userId: actorUserId ?? undefined
  });

  enqueueActivityLog({
    type: ActivityLogType.TOGGLED_MESSAGE_PIN,
    userId: actorUserId,
    details: {
      messageId: message.id,
      channelId: message.channelId,
      pinned,
      pinnedBy: actorUserId ?? undefined
    }
  });
};

export { setMessagePinned };
