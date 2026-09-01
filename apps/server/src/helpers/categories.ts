import { ActivityLogType, type TCategory } from '@sharkord/shared';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import { publishCategory, publishChannel } from '../db/publishers';
import { categories, channels } from '../db/schema';
import { eventBus } from '../plugins/event-bus';
import { enqueueActivityLog } from '../queues/activity-log';
import { VoiceRuntime } from '../runtimes/voice';
import { invariant } from '../utils/invariant';

const zCategoryName = z.string().min(1).max(32);

const createCategory = async (
  name: string,
  userId: number | null
): Promise<TCategory> => {
  const parsedName = zCategoryName.parse(name);

  const [result] = await db
    .select({ maxPos: sql<number>`COALESCE(MAX(${categories.position}), 0)` })
    .from(categories);

  const created = await db
    .insert(categories)
    .values({
      name: parsedName,
      position: (result?.maxPos ?? 0) + 1,
      createdAt: Date.now()
    })
    .returning()
    .get();

  publishCategory(created.id, 'create');

  eventBus.emit('category:created', {
    categoryId: created.id,
    name: created.name
  });

  enqueueActivityLog({
    type: ActivityLogType.CREATED_CATEGORY,
    userId,
    details: {
      categoryName: created.name,
      categoryId: created.id
    }
  });

  return created as TCategory;
};

const updateCategory = async (
  categoryId: number,
  name: string,
  userId: number | null
) => {
  const parsedName = zCategoryName.parse(name);

  const existingCategory = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1)
    .get();

  invariant(existingCategory, {
    code: 'NOT_FOUND',
    message: 'Category not found.'
  });

  await db
    .update(categories)
    .set({ name: parsedName, updatedAt: Date.now() })
    .where(eq(categories.id, categoryId));

  publishCategory(categoryId, 'update');

  eventBus.emit('category:updated', { categoryId, name: parsedName });

  enqueueActivityLog({
    type: ActivityLogType.UPDATED_CATEGORY,
    userId,
    details: {
      categoryId,
      values: { name: parsedName }
    }
  });
};

const deleteCategory = async (categoryId: number, userId: number | null) => {
  // the rows cascade, but the clients and the voice runtimes do not
  const categoryChannels = await db
    .select({ id: channels.id })
    .from(channels)
    .where(eq(channels.categoryId, categoryId));

  const removedCategory = await db
    .delete(categories)
    .where(eq(categories.id, categoryId))
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

  eventBus.emit('category:deleted', {
    categoryId: removedCategory.id,
    name: removedCategory.name
  });

  enqueueActivityLog({
    type: ActivityLogType.DELETED_CATEGORY,
    userId,
    details: {
      categoryId: removedCategory.id,
      categoryName: removedCategory.name,
      channelIds: categoryChannels.map((channel) => channel.id)
    }
  });
};

export { createCategory, deleteCategory, updateCategory, zCategoryName };
