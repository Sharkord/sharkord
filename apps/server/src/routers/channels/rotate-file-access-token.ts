import { ActivityLogType, Permission } from '@sharkord/shared';
import { randomUUIDv7 } from 'bun';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { channels } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const rotateFileAccessTokenRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CHANNELS);

    const channel = await db
      .select()
      .from(channels)
      .where(eq(channels.id, input.channelId))
      .get();

    invariant(channel, {
      code: 'NOT_FOUND',
      message: 'Channel not found'
    });

    invariant(!channel.isDm, {
      code: 'FORBIDDEN',
      message: 'Cannot rotate file access token for DM channels'
    });

    const newToken = randomUUIDv7();

    await db
      .update(channels)
      .set({
        fileAccessToken: newToken,
        fileAccessTokenUpdatedAt: Date.now()
      })
      .where(eq(channels.id, input.channelId));

    enqueueActivityLog({
      type: ActivityLogType.ROTATE_CHANNEL_FILE_ACCESS_TOKEN,
      userId: ctx.user.id
    });
  });

export { rotateFileAccessTokenRoute };
