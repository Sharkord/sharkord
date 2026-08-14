import { ServerEvents } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { initTest } from '../../__tests__/helpers';
import { tdb } from '../../__tests__/setup';
import { channels } from '../../db/schema';
import { VoiceRuntime } from '../../runtimes/voice';
import { pubsub } from '../../utils/pubsub';

describe('categories router', () => {
  test('should throw when user lacks permissions (get)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.categories.get({
        categoryId: 1
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should throw when user lacks permissions (update)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.categories.update({
        categoryId: 1,
        name: 'Updated Category Name'
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should throw when user lacks permissions (delete)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.categories.delete({
        categoryId: 1
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should throw when user lacks permissions (create)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.categories.add({
        name: 'New Category'
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should throw when user lacks permissions (reorder)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.categories.reorder({
        categoryIds: [2, 1]
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should get existing category', async () => {
    const { caller } = await initTest();

    const categories = await caller.categories.get({
      categoryId: 1
    });

    expect(categories).toBeDefined();
    expect(categories.id).toBe(1);
    expect(categories.name).toBe('Text Channels');
  });

  test('should create new category', async () => {
    const { caller } = await initTest();

    const id = await caller.categories.add({
      name: 'New Category'
    });

    const category = await caller.categories.get({
      categoryId: id
    });

    expect(category).toBeDefined();
    expect(category.name).toBe('New Category');
  });

  test('should reorder categories', async () => {
    const { caller } = await initTest();

    await caller.categories.reorder({
      categoryIds: [2, 1]
    });

    const firstCategory = await caller.categories.get({
      categoryId: 1
    });

    const secondCategory = await caller.categories.get({
      categoryId: 2
    });

    expect(firstCategory.position).toBe(2);
    expect(secondCategory.position).toBe(1);
  });

  test('should reorder categories when some ids are missing from payload', async () => {
    const { caller } = await initTest();

    const categoryId = await caller.categories.add({
      name: 'Third Category'
    });

    await caller.categories.reorder({
      categoryIds: [categoryId]
    });

    const [category1, category2, category3] = await Promise.all([
      caller.categories.get({ categoryId: 1 }),
      caller.categories.get({ categoryId: 2 }),
      caller.categories.get({ categoryId })
    ]);

    expect(category3.position).toBe(1);
    expect(category1.position).toBe(2);
    expect(category2.position).toBe(3);
  });

  test('should update existing category', async () => {
    const { caller } = await initTest();

    await caller.categories.update({
      categoryId: 1,
      name: 'Updated Category Name'
    });

    const updatedCategory = await caller.categories.get({
      categoryId: 1
    });

    expect(updatedCategory).toBeDefined();
    expect(updatedCategory.name).toBe('Updated Category Name');
  });

  test('should delete existing category', async () => {
    const { caller } = await initTest();

    await caller.categories.delete({
      categoryId: 1
    });

    await expect(
      caller.categories.get({
        categoryId: 1
      })
    ).rejects.toThrow('Category not found');
  });

  test('should announce the channels a deleted category takes with it', async () => {
    const { caller } = await initTest();

    const channelsBefore = await tdb
      .select({ id: channels.id })
      .from(channels)
      .where(eq(channels.categoryId, 2));

    expect(channelsBefore.length).toBeGreaterThan(0);

    const announcedIds: number[] = [];

    const subscription = pubsub
      .subscribeFor(1, ServerEvents.CHANNEL_DELETE)
      .subscribe({
        next: (channelId) => {
          announcedIds.push(channelId);
        }
      });

    await caller.categories.delete({
      categoryId: 2
    });

    // publishChannel resolves its recipients asynchronously and the route
    // does not await it, so the event lands a tick later
    await Bun.sleep(10);

    subscription.unsubscribe();

    const channelsAfter = await tdb
      .select({ id: channels.id })
      .from(channels)
      .where(eq(channels.categoryId, 2));

    expect(channelsAfter.length).toBe(0);
    expect(announcedIds.sort()).toEqual(channelsBefore.map((c) => c.id).sort());
  });

  // a runtime with no transports needs no mediasoup, so the part of the teardown that matters
  // here is reachable: the call is dropped and everyone still in it is told. the transports
  // and the mediasoup router closing with it are not, and stay manual
  test('should end the call in a voice channel whose category is deleted', async () => {
    const { caller } = await initTest();

    const runtime = new VoiceRuntime(2);

    runtime.addUser(2, { micMuted: false, soundMuted: false });

    const departures: { channelId: number; userId: number }[] = [];

    const subscription = pubsub
      .subscribe(ServerEvents.USER_LEAVE_VOICE)
      .subscribe({
        next: (departure) => {
          departures.push(departure);
        }
      });

    await caller.categories.delete({ categoryId: 2 });

    subscription.unsubscribe();

    expect(VoiceRuntime.findById(2)).toBeUndefined();
    expect(departures).toEqual([{ channelId: 2, userId: 2 }]);
  });

  test('should throw error when deleting non-existing category', async () => {
    const { caller } = await initTest();

    await expect(
      caller.categories.delete({
        categoryId: 999
      })
    ).rejects.toThrow('Category not found');
  });

  test('should throw error when updating non-existing category', async () => {
    const { caller } = await initTest();

    await expect(
      caller.categories.update({
        categoryId: 999,
        name: 'Non-existing Category'
      })
    ).rejects.toThrow('Category not found');
  });
});
