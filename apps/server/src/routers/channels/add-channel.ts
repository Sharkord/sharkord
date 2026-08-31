import {
  ActivityLogType,
  ChannelType,
  Permission,
  type TBeforeChannelCreatePayload,
  type TBeforeChannelCreateUpdate
} from '@sharkord/shared';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishChannel } from '../../db/publishers';
import { categories, channels } from '../../db/schema';
import { pluginManager } from '../../plugins';
import { runHook } from '../../plugins/run-hook';
import { enqueueActivityLog } from '../../queues/activity-log';
import { VoiceRuntime } from '../../runtimes/voice';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const addChannelRoute = protectedProcedure
  .input(
    z.object({
      type: z.enum(ChannelType),
      name: z.string().min(1).max(27),
      categoryId: z.number()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CHANNELS);

    const category = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, input.categoryId))
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
        name: input.name,
        type: input.type,
        categoryId: input.categoryId,
        userId: ctx.user.id
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
        .where(eq(channels.categoryId, input.categoryId))
        .limit(1)
        .get();

      const now = Date.now();

      const newChannel = tx
        .insert(channels)
        .values({
          position:
            maxPositionChannel?.position !== undefined
              ? maxPositionChannel.position + 1
              : 0,
          name,
          type: input.type,
          categoryId: input.categoryId,
          createdAt: now
        })
        .returning()
        .get();

      return newChannel;
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
    enqueueActivityLog({
      type: ActivityLogType.CREATED_CHANNEL,
      userId: ctx.user.id,
      details: {
        channelId: channel.id,
        channelName: channel.name,
        type: channel.type as ChannelType
      }
    });

    return channel.id;
  });

export { addChannelRoute };
