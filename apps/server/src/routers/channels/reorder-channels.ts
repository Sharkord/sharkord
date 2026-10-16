import { ActivityLogType, Permission } from '@sharkord/shared';
import { asc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { reorderPositions } from '../../db/mutations/positions';
import { publishChannel } from '../../db/publishers';
import { categories, channels } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const MAX_REORDERED_CHANNELS = 500;

const reorderChannelsRoute = protectedProcedure
  .input(
    z.object({
      categoryId: z.number(),
      channelIds: z.array(z.number()).max(MAX_REORDERED_CHANNELS)
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CHANNELS);

    const [category, requestedChannels] = await Promise.all([
      db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, input.categoryId))
        .limit(1)
        .get(),
      db
        .select({
          id: channels.id,
          categoryId: channels.categoryId,
          isDm: channels.isDm
        })
        .from(channels)
        .where(inArray(channels.id, input.channelIds))
    ]);

    invariant(category, {
      code: 'NOT_FOUND',
      message: 'Category not found'
    });

    invariant(
      requestedChannels.every((channel) => !channel.isDm),
      {
        code: 'FORBIDDEN',
        message: 'Cannot move DM channels into a category'
      }
    );

    const movedChannelIds = requestedChannels
      .filter((channel) => channel.categoryId !== input.categoryId)
      .map((channel) => channel.id);

    if (movedChannelIds.length > 0) {
      await db
        .update(channels)
        .set({ categoryId: input.categoryId, updatedAt: Date.now() })
        .where(inArray(channels.id, movedChannelIds));
    }

    const existingCategoryChannels = await db
      .select({ id: channels.id })
      .from(channels)
      .where(eq(channels.categoryId, input.categoryId))
      .orderBy(asc(channels.position), asc(channels.id));

    const nextChannelOrder = await reorderPositions(
      channels,
      existingCategoryChannels.map((channel) => channel.id),
      input.channelIds
    );

    nextChannelOrder.forEach((channelId) => {
      publishChannel(channelId, 'update');
    });

    if (nextChannelOrder.length > 0) {
      enqueueActivityLog({
        type: ActivityLogType.REORDERED_CHANNELS,
        userId: ctx.user.id,
        details: {
          categoryId: input.categoryId,
          channelIds: nextChannelOrder
        }
      });
    }
  });

export { reorderChannelsRoute };
