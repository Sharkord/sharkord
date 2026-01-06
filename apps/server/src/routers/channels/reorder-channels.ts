import { ActivityLogType, Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishChannel } from '../../db/publishers';
import { channels } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const reorderChannelsRoute = protectedProcedure
  .input(
    z.object({
      categoryId: z.number(),
      channelIds: z.array(z.number())
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CHANNELS);

    await db.transaction(async (tx) => {
      for (let i = 0; i < input.channelIds.length; i++) {
        const channelId = input.channelIds[i]!;
        const newPosition = i + 1;

        await tx
          .update(channels)
          .set({
            position: newPosition,
            updatedAt: Date.now()
          })
          .where(eq(channels.id, channelId));
      }
    });

    input.channelIds.forEach((channelId) => {
      publishChannel(channelId, 'update');
    });

    if (input.channelIds.length > 0) {
      enqueueActivityLog({
        type: ActivityLogType.UPDATED_CHANNEL,
        userId: ctx.user.id,
        details: {
          channelId: input.channelIds[0]!,
          values: {
            position: input.channelIds.length
          }
        }
      });
    }
  });

export { reorderChannelsRoute };
