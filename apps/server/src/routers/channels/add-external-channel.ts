import { ActivityLogType, ChannelType, Permission } from '@sharkord/shared';
import { randomUUIDv7 } from 'bun';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishExternalChannel } from '../../db/publishers';
import { channels, externalChannels } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { VoiceRuntime } from '../../runtimes/voice';
import { protectedProcedure } from '../../utils/trpc';

const addExternalChannelRoute = protectedProcedure
  .input(
    z.object({
      type: z.enum(ChannelType),
      name: z.string().min(1).max(16),
      createdByUserId: z.number(),
      targetedUserId: z.number()      
    })
  )
  .mutation(async ({ input, ctx }) => {
    const channel = await db.transaction(async (tx) => {
      const now = Date.now();

      const newChannel = await tx
        .insert(externalChannels)
        .values({
          name: input.name,
          type: input.type,
          fileAccessToken: randomUUIDv7(),
          fileAccessTokenUpdatedAt: now,
          createdAt: now
        })
        .returning()
        .get();

      return newChannel;
    });

    if (channel.type === ChannelType.VOICE) {
      const runtime = new VoiceRuntime(channel.id);

      await runtime.init();
    }

    publishExternalChannel(channel.id, 'create');
    enqueueActivityLog({
      type: ActivityLogType.CREATED_EXTERNAL_CHANNEL,
      userId: ctx.user.id,
      details: {
        externalChannelId: channel.id,
        channelName: channel.name,
        type: channel.type as ChannelType
      }
    });

    return channel.id;
  });

export { addExternalChannelRoute };
