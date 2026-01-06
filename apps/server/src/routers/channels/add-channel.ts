import { ActivityLogType, ChannelType, Permission } from '@sharkord/shared';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishChannel } from '../../db/publishers';
import { channels } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { VoiceRuntime } from '../../runtimes/voice';
import { protectedProcedure } from '../../utils/trpc';

const addChannelRoute = protectedProcedure
  .input(
    z.object({
      type: z.enum(ChannelType),
      name: z.string().min(1).max(16),
      categoryId: z.number()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CHANNELS);

    const channel = await db.transaction(async (tx) => {
      const maxPositionChannel = await tx
        .select()
        .from(channels)
        .orderBy(desc(channels.position))
        .where(eq(channels.categoryId, input.categoryId))
        .limit(1)
        .get();

      const newChannel = await tx
        .insert(channels)
        .values({
          position:
            maxPositionChannel?.position !== undefined
              ? maxPositionChannel.position + 1
              : 0,
          name: input.name,
          type: input.type,
          categoryId: input.categoryId,
          createdAt: Date.now()
        })
        .returning()
        .get();

      return newChannel;
    });

    const runtime = new VoiceRuntime(channel.id);

    await runtime.init();

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
  });

export { addChannelRoute };
