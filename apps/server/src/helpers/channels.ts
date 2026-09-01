import {
  ActivityLogType,
  ChannelType,
  type TBeforeChannelCreatePayload,
  type TBeforeChannelCreateUpdate,
  type TChannel
} from '@sharkord/shared';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import { publishChannel } from '../db/publishers';
import { isDirectMessageChannel } from '../db/queries/dms';
import { categories, channels } from '../db/schema';
import { pluginManager } from '../plugins';
import { eventBus } from '../plugins/event-bus';
import { runHook } from '../plugins/run-hook';
import { enqueueActivityLog } from '../queues/activity-log';
import { VoiceRuntime } from '../runtimes/voice';
import { invariant } from '../utils/invariant';

const zChannelName = z.string().min(1).max(27);
const zChannelTopic = z.string().max(128).nullable();

const zCreateChannel = z.object({
  name: zChannelName,
  type: z.enum(ChannelType),
  categoryId: z.number(),
  private: z.boolean().optional()
});

const zUpdateChannel = z.object({
  name: zChannelName.min(2).optional(),
  topic: zChannelTopic.optional(),
  private: z.boolean().optional()
});

type TCreateChannel = z.infer<typeof zCreateChannel>;
type TUpdateChannel = z.infer<typeof zUpdateChannel>;

const createChannel = async (
  input: TCreateChannel,
  userId: number | null
): Promise<TChannel> => {
  const values = zCreateChannel.parse(input);

  const category = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, values.categoryId))
    .limit(1)
    .get();

  invariant(category, {
    code: 'NOT_FOUND',
    message: 'Category not found'
  });

  const { name } = await runHook<
    TBeforeChannelCreatePayload,
    TBeforeChannelCreateUpdate
  >({
    entries: pluginManager.getHooks('beforeChannelCreate'),
    payload: {
      name: values.name,
      type: values.type,
      categoryId: values.categoryId,
      userId: userId ?? undefined
    },
    normalize: (payload, pluginId) => {
      invariant(payload.name.trim().length > 0, {
        code: 'BAD_REQUEST',
        message: `Plugin '${pluginId}' replaced this channel name with nothing.`
      });

      return payload;
    }
  });

  const channel = db.transaction((tx) => {
    const maxPositionChannel = tx
      .select({ position: channels.position })
      .from(channels)
      .orderBy(desc(channels.position))
      .where(eq(channels.categoryId, values.categoryId))
      .limit(1)
      .get();

    return tx
      .insert(channels)
      .values({
        position:
          maxPositionChannel?.position !== undefined
            ? maxPositionChannel.position + 1
            : 0,
        name,
        type: values.type,
        private: values.private ?? false,
        categoryId: values.categoryId,
        createdAt: Date.now()
      })
      .returning()
      .get();
  });

  if (channel.type === ChannelType.VOICE) {
    const runtime = new VoiceRuntime(channel.id);

    try {
      await runtime.init();
    } catch (error) {
      await db.delete(channels).where(eq(channels.id, channel.id));

      throw error;
    }
  }

  publishChannel(channel.id, 'create');

  eventBus.emit('channel:created', {
    channelId: channel.id,
    name: channel.name,
    type: channel.type,
    categoryId: channel.categoryId
  });

  enqueueActivityLog({
    type: ActivityLogType.CREATED_CHANNEL,
    userId,
    details: {
      channelId: channel.id,
      channelName: channel.name,
      type: channel.type as ChannelType
    }
  });

  return channel as TChannel;
};

const assertNotDirectMessage = async (channelId: number, action: string) => {
  const isDmChannel = await isDirectMessageChannel(channelId);

  invariant(!isDmChannel, {
    code: 'FORBIDDEN',
    message: `Cannot ${action} DM channels`
  });
};

const updateChannel = async (
  channelId: number,
  input: TUpdateChannel,
  userId: number | null
) => {
  const parsed = zUpdateChannel.parse(input);

  await assertNotDirectMessage(channelId, 'update');

  const oldChannel = await db
    .select({ private: channels.private })
    .from(channels)
    .where(eq(channels.id, channelId))
    .get();

  invariant(oldChannel, {
    code: 'NOT_FOUND',
    message: 'Channel not found'
  });

  const values = {
    ...(parsed.name !== undefined && { name: parsed.name }),
    ...(parsed.topic !== undefined && { topic: parsed.topic }),
    ...(parsed.private !== undefined && { private: parsed.private })
  };

  invariant(Object.keys(values).length > 0, {
    code: 'BAD_REQUEST',
    message: 'Nothing to update.'
  });

  const updatedChannel = await db
    .update(channels)
    .set(values)
    .where(eq(channels.id, channelId))
    .returning()
    .get();

  // a channel that just became public or private reaches a different audience
  const ensureUserAccess = updatedChannel.private !== oldChannel.private;

  publishChannel(updatedChannel.id, 'update', ensureUserAccess);

  eventBus.emit('channel:updated', {
    channelId: updatedChannel.id,
    name: updatedChannel.name,
    type: updatedChannel.type,
    categoryId: updatedChannel.categoryId
  });

  enqueueActivityLog({
    type: ActivityLogType.UPDATED_CHANNEL,
    userId,
    details: {
      channelId: updatedChannel.id,
      values: parsed
    }
  });
};

const deleteChannel = async (channelId: number, userId: number | null) => {
  await assertNotDirectMessage(channelId, 'delete');

  const removedChannel = await db
    .delete(channels)
    .where(eq(channels.id, channelId))
    .returning()
    .get();

  invariant(removedChannel, {
    code: 'NOT_FOUND',
    message: 'Channel not found'
  });

  await VoiceRuntime.findById(removedChannel.id)?.destroy();

  publishChannel(removedChannel.id, 'delete');

  eventBus.emit('channel:deleted', {
    channelId: removedChannel.id,
    name: removedChannel.name
  });

  enqueueActivityLog({
    type: ActivityLogType.DELETED_CHANNEL,
    userId,
    details: {
      channelId: removedChannel.id,
      channelName: removedChannel.name
    }
  });
};

export {
  createChannel,
  deleteChannel,
  updateChannel,
  zChannelName,
  zChannelTopic
};
export type { TCreateChannel, TUpdateChannel };
