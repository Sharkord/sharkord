import { ActivityLogType, Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishCategory, publishChannel } from '../../db/publishers';
import { categories, channels } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { VoiceRuntime } from '../../runtimes/voice';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const deleteCategoryRoute = protectedProcedure
  .input(
    z.object({
      categoryId: z.number()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CATEGORIES);

    const categoryChannels = await db
      .select({ id: channels.id })
      .from(channels)
      .where(eq(channels.categoryId, input.categoryId));

    const removedCategory = await db
      .delete(categories)
      .where(eq(categories.id, input.categoryId))
      .returning()
      .get();

    invariant(removedCategory, {
      code: 'NOT_FOUND',
      message: 'Category not found'
    });

    for (const channel of categoryChannels) {
      await VoiceRuntime.findById(channel.id)?.destroy();
      publishChannel(channel.id, 'delete');
    }

    publishCategory(removedCategory.id, 'delete');
    enqueueActivityLog({
      type: ActivityLogType.DELETED_CATEGORY,
      userId: ctx.user.id,
      details: {
        categoryId: removedCategory.id,
        categoryName: removedCategory.name,
        channelIds: categoryChannels.map((channel) => channel.id)
      }
    });
  });

export { deleteCategoryRoute };
