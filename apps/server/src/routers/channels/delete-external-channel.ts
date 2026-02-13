import { ActivityLogType, Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishExternalChannel } from '../../db/publishers';
import { channels, externalChannels } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { VoiceRuntime } from '../../runtimes/voice';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const deleteExternalChannelRoute = protectedProcedure
  .input(
    z.object({
      externalChannelId: z.number()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CHANNELS);

    const removedChannel = await db
      .delete(externalChannels)
      .where(eq(externalChannels.id, input.externalChannelId))
      .returning()
      .get();

    invariant(removedChannel, {
      code: 'NOT_FOUND',
      message: 'Channel not found'
    });

    const runtime = VoiceRuntime.findById(removedChannel.id);

    if (runtime) {
      runtime.destroy();
    }

    publishExternalChannel(removedChannel.id, 'delete');
    enqueueActivityLog({
      type: ActivityLogType.DELETED_EXTERNAL_CHANNEL,
      userId: ctx.user.id,
      details: {
        externalChannelId: removedChannel.id,
        externalChannelName: removedChannel.name
      }
    });
  });

export { deleteExternalChannelRoute };
