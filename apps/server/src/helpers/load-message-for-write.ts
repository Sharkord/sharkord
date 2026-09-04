import { Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { messages } from '../db/schema';
import { invariant } from '../utils/invariant';
import type { Context } from '../utils/trpc';
import { assertChannelAccess } from './assert-channel-access';

type TMessageForWrite = {
  id: number;
  userId: number | null;
  pluginId: string | null;
  channelId: number;
  parentMessageId: number | null;
  editable: boolean | null;
  pinned: boolean | null;
};

const assertCanModifyMessage = async (
  ctx: Context,
  message: Pick<TMessageForWrite, 'userId'>,
  action: string
) => {
  invariant(
    message.userId === ctx.user.id ||
      (await ctx.hasPermission(Permission.MANAGE_MESSAGES)),
    {
      code: 'FORBIDDEN',
      message: `You do not have permission to ${action}`
    }
  );
};

const loadMessage = async (messageId: number): Promise<TMessageForWrite> => {
  const message = await db
    .select({
      id: messages.id,
      userId: messages.userId,
      pluginId: messages.pluginId,
      channelId: messages.channelId,
      parentMessageId: messages.parentMessageId,
      editable: messages.editable,
      pinned: messages.pinned
    })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1)
    .get();

  invariant(message, {
    code: 'NOT_FOUND',
    message: 'Message not found'
  });

  return message;
};

const loadMessageForWrite = async (
  ctx: Context,
  messageId: number
): Promise<TMessageForWrite> => {
  const message = await loadMessage(messageId);

  await assertChannelAccess(ctx, message.channelId);

  return message;
};

export { assertCanModifyMessage, loadMessage, loadMessageForWrite };
export type { TMessageForWrite };
